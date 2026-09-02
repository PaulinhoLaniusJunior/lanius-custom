import { Decimal, dec, dinheiro, quantidade, type ValorDecimal } from "@/lib/decimal";

/**
 * Regras do lançamento retroativo — produtos que foram comprados e consumidos
 * antes de o sistema existir, e que chegam por planilha.
 *
 * Não dá para encadear `aplicarEntrada` e `aplicarSaida` aqui: a saída sempre
 * cobra pelo custo médio do produto, e a entrada acabaria de mexer nesse custo.
 * Uma compra antiga de 10 L a R$ 60 num produto que hoje tem 20 L a R$ 55
 * deixaria a média em R$ 56,67 e cobraria R$ 566,70 do serviço, em vez dos
 * R$ 600,00 que estão na planilha — distorcendo um estoque que já está certo.
 */

/** Marca gravada nos movimentos criados pela importação, para o histórico se explicar. */
export const MARCA_IMPORTACAO = "Importação de planilha";

/** Diferença em reais que aceitamos entre o total informado e o calculado. */
export const TOLERANCIA_TOTAL = new Decimal("0.05");

export type MovimentoImportado = {
  quantidade: Decimal;
  custoUnitario: Decimal;
  custoTotal: Decimal;
};

export type ConsumoHistorico = {
  entrada: MovimentoImportado;
  saida: MovimentoImportado;
  /** Posição do produto depois da importação. */
  saldoAtual: Decimal;
  custoMedio: Decimal;
  /** `true` quando o custo médio foi definido pela importação. */
  definiuCustoMedio: boolean;
};

/**
 * Compra e consumo que já aconteceram, lançados de uma vez.
 *
 * Gera os dois movimentos pelo preço da planilha e devolve a posição do
 * produto **inalterada**: entra e sai a mesma quantidade, pelo mesmo preço.
 *
 * A única exceção é o produto sem histórico nenhum (saldo e custo zerados,
 * normalmente recém-criado pela própria importação): nele o preço da planilha
 * vira o custo médio, para o cadastro não ficar com custo zero.
 */
export function consumoHistorico(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
  quantidade: ValorDecimal;
  precoUnitario: ValorDecimal;
}): ConsumoHistorico {
  const saldo = dec(params.saldoAtual);
  const medio = dec(params.custoMedio);
  const qtd = dec(params.quantidade);
  const preco = dec(params.precoUnitario);

  if (qtd.lte(0)) {
    throw new Error("A quantidade precisa ser maior que zero.");
  }
  if (preco.lt(0)) {
    throw new Error("O preço não pode ser negativo.");
  }

  const custoTotal = dinheiro(qtd.mul(preco));
  const movimento: MovimentoImportado = {
    quantidade: quantidade(qtd),
    custoUnitario: preco,
    custoTotal,
  };

  const semHistorico = saldo.isZero() && medio.isZero();

  return {
    entrada: movimento,
    saida: movimento,
    saldoAtual: quantidade(saldo),
    custoMedio: semHistorico ? preco : medio,
    definiuCustoMedio: semHistorico,
  };
}

export type ConferenciaTotal = {
  /** Total que será gravado: sempre quantidade x preço unitário. */
  total: Decimal;
  /** Diferença absoluta contra o total informado. `null` se não veio total. */
  diferenca: Decimal | null;
  /** `true` quando a diferença passa da tolerância e a linha deve ser corrigida. */
  divergente: boolean;
};

/**
 * Confere o total informado na planilha contra quantidade x preço unitário.
 *
 * Diferença de centavos é arredondamento de quem montou a planilha e passa
 * batido; diferença maior é erro de digitação e precisa ser vista antes de
 * virar custo de serviço.
 */
export function conferirTotal(params: {
  quantidade: ValorDecimal;
  precoUnitario: ValorDecimal;
  totalInformado?: ValorDecimal | null;
}): ConferenciaTotal {
  const total = dinheiro(dec(params.quantidade).mul(dec(params.precoUnitario)));

  if (params.totalInformado === null || params.totalInformado === undefined) {
    return { total, diferenca: null, divergente: false };
  }

  const diferenca = dinheiro(dec(params.totalInformado).minus(total).abs());

  return {
    total,
    diferenca,
    divergente: diferenca.gt(TOLERANCIA_TOTAL),
  };
}
