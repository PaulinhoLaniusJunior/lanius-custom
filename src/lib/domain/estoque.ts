import { Decimal, dec, dinheiro, quantidade, type ValorDecimal } from "@/lib/decimal";

/**
 * Regras do estoque valorizado por custo medio ponderado.
 *
 * Sao funcoes puras: nao tocam no banco. Quem grava (as Server Actions) chama
 * uma destas para descobrir o novo saldo e o novo custo, e escreve o movimento
 * e o produto na mesma transacao.
 */

export class SaldoInsuficienteError extends Error {
  constructor(
    readonly disponivel: Decimal,
    readonly solicitado: Decimal,
  ) {
    super(
      `Saldo insuficiente: disponível ${disponivel.toString()}, solicitado ${solicitado.toString()}.`,
    );
    this.name = "SaldoInsuficienteError";
  }
}

export type PosicaoEstoque = {
  saldoAtual: Decimal;
  custoMedio: Decimal;
};

/**
 * Entrada de mercadoria.
 *
 *   novoCustoMedio = (saldo x custoMedio + qtd x precoUnitario) / (saldo + qtd)
 *
 * O custo medio so muda aqui — comprar mais caro ou mais barato dilui a media,
 * que e o que da o custo justo na hora de consumir.
 */
export function aplicarEntrada(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
  quantidade: ValorDecimal;
  precoUnitario: ValorDecimal;
}): PosicaoEstoque {
  const saldo = dec(params.saldoAtual);
  const medio = dec(params.custoMedio);
  const qtd = dec(params.quantidade);
  const preco = dec(params.precoUnitario);

  if (qtd.lte(0)) {
    throw new Error("A quantidade de entrada precisa ser maior que zero.");
  }
  if (preco.lt(0)) {
    throw new Error("O preço de entrada não pode ser negativo.");
  }

  const novoSaldo = saldo.plus(qtd);
  const valorAnterior = saldo.mul(medio);
  const valorEntrada = qtd.mul(preco);

  // Saldo negativo (por ajuste manual) tornaria a media sem sentido: nesse
  // caso a entrada define sozinha o novo custo.
  const novoCustoMedio = novoSaldo.gt(0)
    ? valorAnterior.plus(valorEntrada).div(novoSaldo)
    : preco;

  return {
    saldoAtual: quantidade(novoSaldo),
    custoMedio: novoCustoMedio.toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
  };
}

export type ResultadoSaida = PosicaoEstoque & {
  /** Custo medio congelado no momento da baixa. */
  custoUnitario: Decimal;
  custoTotal: Decimal;
};

/**
 * Baixa de produto para um servico.
 *
 * Congela o custo medio do momento no movimento: uma compra futura mais cara
 * nao pode reescrever o custo de um servico ja fechado.
 */
export function aplicarSaida(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
  quantidade: ValorDecimal;
}): ResultadoSaida {
  const saldo = dec(params.saldoAtual);
  const medio = dec(params.custoMedio);
  const qtd = dec(params.quantidade);

  if (qtd.lte(0)) {
    throw new Error("A quantidade de saída precisa ser maior que zero.");
  }
  if (qtd.gt(saldo)) {
    throw new SaldoInsuficienteError(saldo, qtd);
  }

  return {
    saldoAtual: quantidade(saldo.minus(qtd)),
    // A saida nao altera a media: apenas consome do que ja estava valorizado.
    custoMedio: medio,
    custoUnitario: medio,
    custoTotal: dinheiro(qtd.mul(medio)),
  };
}

/**
 * Estorno de uma baixa: o produto volta ao estoque pelo custo com que saiu.
 *
 * Devolver pela media atual criaria dinheiro do nada quando o custo tivesse
 * mudado entre a baixa e o estorno, entao reaplicamos a formula da entrada
 * usando o custo unitario gravado no movimento original.
 */
export function aplicarEstorno(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
  quantidade: ValorDecimal;
  custoUnitario: ValorDecimal;
}): PosicaoEstoque {
  return aplicarEntrada({
    saldoAtual: params.saldoAtual,
    custoMedio: params.custoMedio,
    quantidade: params.quantidade,
    precoUnitario: params.custoUnitario,
  });
}

/**
 * Ajuste manual de inventario: define o saldo contado na prateleira.
 * Sobra entra pela media atual; falta sai pela media atual.
 */
export function aplicarAjuste(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
  saldoContado: ValorDecimal;
}): ResultadoSaida & { diferenca: Decimal } {
  const saldo = dec(params.saldoAtual);
  const medio = dec(params.custoMedio);
  const contado = dec(params.saldoContado);

  if (contado.lt(0)) {
    throw new Error("O saldo contado não pode ser negativo.");
  }

  const diferenca = contado.minus(saldo);

  return {
    saldoAtual: quantidade(contado),
    custoMedio: medio,
    custoUnitario: medio,
    custoTotal: dinheiro(diferenca.abs().mul(medio)),
    diferenca: quantidade(diferenca),
  };
}

/** Valor total parado no estoque de um produto. */
export function valorEmEstoque(params: {
  saldoAtual: ValorDecimal;
  custoMedio: ValorDecimal;
}): Decimal {
  return dinheiro(dec(params.saldoAtual).mul(dec(params.custoMedio)));
}

/** Um produto esta abaixo do minimo quando o minimo foi definido e o saldo nao o alcanca. */
export function abaixoDoMinimo(params: {
  saldoAtual: ValorDecimal;
  estoqueMinimo: ValorDecimal;
}): boolean {
  const minimo = dec(params.estoqueMinimo);
  if (minimo.lte(0)) return false;
  return dec(params.saldoAtual).lt(minimo);
}
