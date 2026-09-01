import { Decimal, dec, dinheiro, somar, type ValorDecimal } from "@/lib/decimal";

import { custoDaAlocacao, type Alocacao } from "./mao-de-obra";

/**
 * Fechamento financeiro de um servico: o que foi orcado contra o que custou.
 */

export type ResumoServico = {
  custoProdutos: Decimal;
  custoGastos: Decimal;
  custoMaoDeObra: Decimal;
  custoTotal: Decimal;
  valorOrcado: Decimal;
  /** Orcado menos custo total. Negativo significa prejuizo. */
  margem: Decimal;
  /** Margem sobre o valor orcado, em %. `null` quando nao ha orcamento lancado. */
  margemPercentual: Decimal | null;
  totalDiasTrabalhados: number;
};

export function resumoDoServico(params: {
  valorOrcado: ValorDecimal;
  /** `custoTotal` de cada movimento de saida lancado no servico. */
  custosProdutos: ValorDecimal[];
  /** `valor` de cada gasto avulso. */
  gastos: ValorDecimal[];
  /** Uma entrada por pessoa alocada, com os dias lancados para ela. */
  equipe: { alocacao: Alocacao; dias: Date[] }[];
}): ResumoServico {
  const valorOrcado = dinheiro(params.valorOrcado);
  const custoProdutos = dinheiro(somar(params.custosProdutos));
  const custoGastos = dinheiro(somar(params.gastos));

  let custoMaoDeObra = new Decimal(0);
  let totalDiasTrabalhados = 0;

  for (const membro of params.equipe) {
    const resultado = custoDaAlocacao({
      alocacao: membro.alocacao,
      dias: membro.dias,
      valorOrcado,
    });
    custoMaoDeObra = custoMaoDeObra.plus(resultado.custo);
    totalDiasTrabalhados += resultado.totalDias;
  }

  custoMaoDeObra = dinheiro(custoMaoDeObra);
  const custoTotal = dinheiro(
    custoProdutos.plus(custoGastos).plus(custoMaoDeObra),
  );
  const margem = dinheiro(valorOrcado.minus(custoTotal));

  return {
    custoProdutos,
    custoGastos,
    custoMaoDeObra,
    custoTotal,
    valorOrcado,
    margem,
    margemPercentual: valorOrcado.gt(0)
      ? dec(margem.div(valorOrcado).mul(100)).toDecimalPlaces(
          1,
          Decimal.ROUND_HALF_UP,
        )
      : null,
    totalDiasTrabalhados,
  };
}

/**
 * Dias corridos que o servico ja consumiu, do inicio ate a conclusao
 * (ou ate hoje, se ainda estiver aberto).
 */
export function diasCorridos(
  dataInicio: Date,
  dataConclusao: Date | null,
  hoje: Date = new Date(),
): number {
  const fim = dataConclusao ?? hoje;
  const umDia = 24 * 60 * 60 * 1000;
  const diferenca = Math.floor((fim.getTime() - dataInicio.getTime()) / umDia);
  return Math.max(0, diferenca) + 1;
}
