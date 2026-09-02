import type { ProblemaPlanilha } from "@/lib/planilha/leitor";

/**
 * Tipos e estado da importação por planilha.
 *
 * Ficam fora do arquivo de actions porque um módulo `"use server"` só pode
 * exportar funções assíncronas.
 *
 * Tudo aqui já vem formatado em texto: o retorno de uma Server Action é
 * serializado até o navegador, e `Decimal` não atravessa essa fronteira.
 */

export type PreviaProduto = {
  linha: number;
  produto: string;
  unidade: string;
  quantidade: string;
  precoUnitario: string;
  custoTotal: string;
  /** `true` quando o produto será criado pela importação. */
  novo: boolean;
};

export type PreviaImportacao = {
  servico: {
    cliente: string;
    veiculo: string;
    placa: string | null;
    situacao: string;
    dataInicio: string;
    dataConclusao: string | null;
    valorOrcado: string;
  };
  produtos: PreviaProduto[];
  gastos: { descricao: string; categoria: string; valor: string }[];
  equipe: { nome: string; remuneracao: string; dias: number; novo: boolean }[];
  totais: {
    produtos: string;
    gastos: string;
    maoDeObra: string;
    custoTotal: string;
    margem: string;
    margemNegativa: boolean;
  };
  produtosNovos: number;
  funcionariosNovos: number;
};

export type EstadoImportacao = {
  erro?: string;
  /** Erros que impedem a importação, com aba, linha e coluna. */
  problemas?: ProblemaPlanilha[];
  /** Pontos de atenção que não impedem nada. */
  avisos?: ProblemaPlanilha[];
  previa?: PreviaImportacao;
};

export const ESTADO_IMPORTACAO: EstadoImportacao = {};
