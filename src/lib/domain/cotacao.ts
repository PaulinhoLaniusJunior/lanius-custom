import { Decimal, dec, dinheiro, type ValorDecimal } from "@/lib/decimal";

/**
 * Comparacao de precos entre fornecedores para os itens de uma cotacao.
 *
 * Funcoes puras sobre os dados ja lidos do banco, para que a escolha do menor
 * preco seja testavel sem subir banco nenhum.
 */

export type ItemCotacao = {
  produtoId: string;
  produtoNome: string;
  unidade: string;
  quantidade: Decimal;
};

export type PrecoDeFornecedor = {
  produtoId: string;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorTelefone: string | null;
  fornecedorCidade: string | null;
  preco: Decimal;
  atualizadoEm: Date;
};

export type MelhorPreco = {
  item: ItemCotacao;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorTelefone: string | null;
  fornecedorCidade: string | null;
  preco: Decimal;
  subtotal: Decimal;
  atualizadoEm: Date;
  /** Quantos fornecedores tem preco para este produto. */
  concorrentes: number;
  /** Quanto se economiza contra o preco mais caro. `null` se so ha um preco. */
  economia: Decimal | null;
};

export type ResultadoMelhoresPrecos = {
  encontrados: MelhorPreco[];
  /** Itens sem nenhum preco cadastrado — precisam aparecer, nao sumir. */
  semPreco: ItemCotacao[];
  total: Decimal;
};

/**
 * Para cada item, escolhe o fornecedor mais barato.
 * Empate no preco: vence o preco atualizado mais recentemente.
 */
export function melhoresPrecos(
  itens: ItemCotacao[],
  precos: PrecoDeFornecedor[],
): ResultadoMelhoresPrecos {
  const porProduto = new Map<string, PrecoDeFornecedor[]>();
  for (const preco of precos) {
    const lista = porProduto.get(preco.produtoId);
    if (lista) lista.push(preco);
    else porProduto.set(preco.produtoId, [preco]);
  }

  const encontrados: MelhorPreco[] = [];
  const semPreco: ItemCotacao[] = [];
  let total = new Decimal(0);

  for (const item of itens) {
    const candidatos = porProduto.get(item.produtoId);

    if (!candidatos || candidatos.length === 0) {
      semPreco.push(item);
      continue;
    }

    let melhor = candidatos[0];
    let maisCaro = candidatos[0];

    for (const candidato of candidatos.slice(1)) {
      const maisBarato = candidato.preco.lt(melhor.preco);
      const empateMaisRecente =
        candidato.preco.eq(melhor.preco) &&
        candidato.atualizadoEm > melhor.atualizadoEm;

      if (maisBarato || empateMaisRecente) melhor = candidato;
      if (candidato.preco.gt(maisCaro.preco)) maisCaro = candidato;
    }

    const subtotal = dinheiro(item.quantidade.mul(melhor.preco));
    total = total.plus(subtotal);

    encontrados.push({
      item,
      fornecedorId: melhor.fornecedorId,
      fornecedorNome: melhor.fornecedorNome,
      fornecedorTelefone: melhor.fornecedorTelefone,
      fornecedorCidade: melhor.fornecedorCidade,
      preco: melhor.preco,
      subtotal,
      atualizadoEm: melhor.atualizadoEm,
      concorrentes: candidatos.length,
      economia: maisCaro.preco.gt(melhor.preco)
        ? dinheiro(item.quantidade.mul(maisCaro.preco.minus(melhor.preco)))
        : null,
    });
  }

  return { encontrados, semPreco, total: dinheiro(total) };
}

export type GrupoFornecedor = {
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorTelefone: string | null;
  fornecedorCidade: string | null;
  linhas: MelhorPreco[];
  subtotal: Decimal;
};

/**
 * Agrupa os melhores precos por fornecedor e ordena por nome — e assim que a
 * lista de compras e impressa: uma folha por fornecedor, na ordem de visita.
 */
export function agruparPorFornecedor(
  melhores: MelhorPreco[],
): GrupoFornecedor[] {
  const grupos = new Map<string, GrupoFornecedor>();

  for (const linha of melhores) {
    const grupo = grupos.get(linha.fornecedorId);
    if (grupo) {
      grupo.linhas.push(linha);
      grupo.subtotal = grupo.subtotal.plus(linha.subtotal);
      continue;
    }

    grupos.set(linha.fornecedorId, {
      fornecedorId: linha.fornecedorId,
      fornecedorNome: linha.fornecedorNome,
      fornecedorTelefone: linha.fornecedorTelefone,
      fornecedorCidade: linha.fornecedorCidade,
      linhas: [linha],
      subtotal: linha.subtotal,
    });
  }

  const ordenados = [...grupos.values()].sort((a, b) =>
    a.fornecedorNome.localeCompare(b.fornecedorNome, "pt-BR"),
  );

  for (const grupo of ordenados) {
    grupo.subtotal = dinheiro(grupo.subtotal);
    grupo.linhas.sort((a, b) =>
      a.item.produtoNome.localeCompare(b.item.produtoNome, "pt-BR"),
    );
  }

  return ordenados;
}

/** Quanto a compra pelo menor preco economiza contra comprar tudo no mais caro. */
export function economiaTotal(melhores: MelhorPreco[]): Decimal {
  let total = new Decimal(0);
  for (const linha of melhores) {
    if (linha.economia) total = total.plus(linha.economia);
  }
  return dinheiro(total);
}

/** Sugere a quantidade a comprar para repor um produto ate o estoque minimo. */
export function quantidadeParaRepor(params: {
  saldoAtual: ValorDecimal;
  estoqueMinimo: ValorDecimal;
}): Decimal {
  const falta = dec(params.estoqueMinimo).minus(dec(params.saldoAtual));
  return falta.gt(0) ? falta.toDecimalPlaces(3, Decimal.ROUND_HALF_UP) : new Decimal(0);
}
