import { Decimal, dec, dinheiro, type ValorDecimal } from "@/lib/decimal";

/**
 * Custo de mao de obra por servico.
 *
 * Os funcionarios hoje sao mensalistas, entao o custo de um dia trabalhado sai
 * do salario dividido pelos dias uteis do proprio mes daquele dia — um mesmo
 * salario custa mais por dia em um mes com menos dias uteis.
 *
 * Os valores usados no calculo sao copias gravadas na alocacao do servico, e
 * nao o cadastro atual do funcionario: aumentar o salario nao pode reescrever
 * o custo de servicos ja fechados.
 */

export type TipoRemuneracao = "SALARIO" | "DIARIA" | "COMISSAO";

/**
 * Dias uteis (segunda a sexta) do mes da data informada.
 *
 * Feriados nao entram na conta: a oficina trabalha em muitos deles e nao ha
 * calendario municipal cadastrado. Se isso passar a importar, e aqui que muda.
 */
export function diasUteisDoMes(data: Date): number {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth();

  // Dia 0 do mes seguinte e o ultimo dia deste mes.
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

  let uteis = 0;
  for (let dia = 1; dia <= diasNoMes; dia += 1) {
    const diaSemana = new Date(Date.UTC(ano, mes, dia)).getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) uteis += 1;
  }
  return uteis;
}

/** Um dia em milissegundos, usado para caminhar por um período. */
const UM_DIA = 24 * 60 * 60 * 1000;

/**
 * Lista os dias de um período, pulando sábados e domingos por padrão.
 *
 * Um serviço costuma ocupar a pessoa por vários dias seguidos, então tanto o
 * lançamento pela tela quanto a importação por planilha informam um intervalo
 * em vez de marcar dia a dia.
 */
export function expandirPeriodo(
  de: Date,
  ate: Date = de,
  incluirFimDeSemana = false,
): Date[] {
  if (ate < de) return [];

  const dias: Date[] = [];
  for (
    let data = new Date(de.getTime());
    data <= ate;
    data = new Date(data.getTime() + UM_DIA)
  ) {
    const diaSemana = data.getUTCDay();
    if (!incluirFimDeSemana && (diaSemana === 0 || diaSemana === 6)) continue;
    dias.push(new Date(data));
  }
  return dias;
}

/** Valor de um dia de trabalho para um mensalista, no mes da data informada. */
export function valorDoDiaPorSalario(
  salarioMensal: ValorDecimal,
  data: Date,
): Decimal {
  const uteis = diasUteisDoMes(data);
  if (uteis === 0) return new Decimal(0);
  return dec(salarioMensal).div(uteis);
}

export type Alocacao = {
  tipoRemuneracao: TipoRemuneracao;
  salarioMensal?: ValorDecimal | null;
  valorDiaria?: ValorDecimal | null;
  percentualComissao?: ValorDecimal | null;
};

export type CustoAlocacao = {
  /** Quantidade de dias lancados para esta pessoa neste servico. */
  totalDias: number;
  custo: Decimal;
  /** Valor medio por dia, util para exibir na tela. `null` na comissao. */
  valorMedioDia: Decimal | null;
};

/**
 * Custo de uma pessoa em um servico.
 *
 * - SALARIO: soma, dia a dia, o salario dividido pelos dias uteis do mes do dia.
 * - DIARIA: quantidade de dias vezes o valor combinado.
 * - COMISSAO: percentual sobre o valor orcado do servico, independente de dias.
 */
export function custoDaAlocacao(params: {
  alocacao: Alocacao;
  dias: Date[];
  valorOrcado: ValorDecimal;
}): CustoAlocacao {
  const { alocacao, dias } = params;
  const totalDias = dias.length;

  if (alocacao.tipoRemuneracao === "COMISSAO") {
    const percentual = dec(alocacao.percentualComissao);
    const custo = dinheiro(dec(params.valorOrcado).mul(percentual).div(100));
    return { totalDias, custo, valorMedioDia: null };
  }

  if (alocacao.tipoRemuneracao === "DIARIA") {
    const diaria = dec(alocacao.valorDiaria);
    const custo = dinheiro(diaria.mul(totalDias));
    return { totalDias, custo, valorMedioDia: totalDias > 0 ? diaria : null };
  }

  const salario = dec(alocacao.salarioMensal);
  let bruto = new Decimal(0);
  for (const dia of dias) {
    bruto = bruto.plus(valorDoDiaPorSalario(salario, dia));
  }

  const custo = dinheiro(bruto);
  return {
    totalDias,
    custo,
    valorMedioDia: totalDias > 0 ? dinheiro(custo.div(totalDias)) : null,
  };
}

/**
 * Explica em uma linha como o custo foi calculado, para aparecer na tela.
 * Sem isso o numero vira caixa-preta na hora de conferir.
 */
export function explicarCalculo(params: {
  alocacao: Alocacao;
  dias: Date[];
}): string {
  const { alocacao, dias } = params;

  if (alocacao.tipoRemuneracao === "COMISSAO") {
    return `${dec(alocacao.percentualComissao).toString()}% sobre o valor orçado`;
  }

  if (alocacao.tipoRemuneracao === "DIARIA") {
    return `${dias.length} dia(s) × diária combinada`;
  }

  if (dias.length === 0) return "salário / dias úteis do mês";

  const mesesUsados = new Set(dias.map((dia) => diasUteisDoMes(dia)));
  const uteis = [...mesesUsados].sort((a, b) => a - b).join(" e ");
  return `${dias.length} dia(s) × (salário / ${uteis} dias úteis)`;
}
