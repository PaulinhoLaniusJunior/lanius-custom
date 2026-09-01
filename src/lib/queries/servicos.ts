import "server-only";

import { dec, type Decimal } from "@/lib/decimal";
import type { TipoRemuneracao } from "@/lib/domain/mao-de-obra";
import { resumoDoServico, type ResumoServico } from "@/lib/domain/servico";
import { prisma } from "@/lib/prisma";
import type { StatusServico } from "@/generated/prisma/enums";

/**
 * Um servico com tudo que entra no seu custo: produtos baixados do estoque,
 * gastos avulsos e a equipe com os dias lancados.
 */
const INCLUIR_CUSTOS = {
  movimentos: {
    where: { tipo: "SAIDA_SERVICO" as const },
    select: { custoTotal: true },
  },
  gastos: { select: { valor: true } },
  equipe: {
    select: {
      tipoRemuneracao: true,
      salarioMensal: true,
      valorDiaria: true,
      percentualComissao: true,
      dias: { select: { data: true } },
    },
  },
} as const;

type ServicoComCustos = {
  valorOrcado: Decimal;
  movimentos: { custoTotal: Decimal }[];
  gastos: { valor: Decimal }[];
  equipe: {
    tipoRemuneracao: TipoRemuneracao;
    salarioMensal: Decimal | null;
    valorDiaria: Decimal | null;
    percentualComissao: Decimal | null;
    dias: { data: Date }[];
  }[];
};

/** Traduz o registro do banco para a funcao pura que faz as contas. */
export function calcularResumo(servico: ServicoComCustos): ResumoServico {
  return resumoDoServico({
    valorOrcado: dec(servico.valorOrcado),
    custosProdutos: servico.movimentos.map((movimento) => dec(movimento.custoTotal)),
    gastos: servico.gastos.map((gasto) => dec(gasto.valor)),
    equipe: servico.equipe.map((membro) => ({
      alocacao: {
        tipoRemuneracao: membro.tipoRemuneracao,
        salarioMensal: membro.salarioMensal,
        valorDiaria: membro.valorDiaria,
        percentualComissao: membro.percentualComissao,
      },
      dias: membro.dias.map((dia) => dia.data),
    })),
  });
}

export type ServicoResumido = {
  id: string;
  numero: number;
  cliente: string;
  veiculo: string;
  placa: string | null;
  status: StatusServico;
  dataInicio: Date;
  dataConclusao: Date | null;
  resumo: ResumoServico;
};

/** Lista de servicos com o fechamento financeiro de cada um ja calculado. */
export async function listarServicosComResumo(params?: {
  status?: StatusServico[];
  limite?: number;
}): Promise<ServicoResumido[]> {
  const servicos = await prisma.servico.findMany({
    where: params?.status ? { status: { in: params.status } } : undefined,
    orderBy: { dataInicio: "desc" },
    take: params?.limite,
    select: {
      id: true,
      numero: true,
      cliente: true,
      veiculo: true,
      placa: true,
      status: true,
      dataInicio: true,
      dataConclusao: true,
      valorOrcado: true,
      ...INCLUIR_CUSTOS,
    },
  });

  return servicos.map((servico) => ({
    id: servico.id,
    numero: servico.numero,
    cliente: servico.cliente,
    veiculo: servico.veiculo,
    placa: servico.placa,
    status: servico.status,
    dataInicio: servico.dataInicio,
    dataConclusao: servico.dataConclusao,
    resumo: calcularResumo(servico),
  }));
}

/** Servico completo, com todos os lancamentos, para a tela de detalhe. */
export async function buscarServicoCompleto(id: string) {
  return prisma.servico.findUnique({
    where: { id },
    include: {
      movimentos: {
        where: { tipo: "SAIDA_SERVICO" },
        orderBy: { data: "desc" },
        include: {
          produto: { select: { id: true, nome: true, unidade: true } },
        },
      },
      gastos: { orderBy: { data: "desc" } },
      equipe: {
        orderBy: { criadoEm: "asc" },
        include: {
          funcionario: { select: { id: true, nome: true } },
          dias: { orderBy: { data: "asc" } },
        },
      },
    },
  });
}

export const ROTULO_STATUS: Record<StatusServico, string> = {
  ORCAMENTO: "Orçamento",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
