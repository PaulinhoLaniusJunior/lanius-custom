import type {
  CategoriaGasto,
  StatusServico,
  TipoMovimento,
  TipoRemuneracao,
  UnidadeMedida,
} from "@/generated/prisma/enums";

/** Textos que os enums do banco assumem na tela, em um lugar só. */

export const UNIDADES: { valor: UnidadeMedida; rotulo: string }[] = [
  { valor: "UN", rotulo: "UN — unidade" },
  { valor: "L", rotulo: "L — litro" },
  { valor: "ML", rotulo: "ML — mililitro" },
  { valor: "KG", rotulo: "KG — quilo" },
  { valor: "G", rotulo: "G — grama" },
  { valor: "M", rotulo: "M — metro" },
  { valor: "M2", rotulo: "M² — metro quadrado" },
  { valor: "CX", rotulo: "CX — caixa" },
  { valor: "PC", rotulo: "PC — peça" },
];

export const ROTULO_UNIDADE: Record<UnidadeMedida, string> = {
  UN: "UN",
  L: "L",
  ML: "ml",
  KG: "kg",
  G: "g",
  M: "m",
  M2: "m²",
  CX: "CX",
  PC: "PC",
};

export const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = {
  ENTRADA: "Entrada",
  SAIDA_SERVICO: "Saída",
  AJUSTE: "Ajuste",
  ESTORNO_SERVICO: "Estorno",
};

export const ROTULO_STATUS_SERVICO: Record<StatusServico, string> = {
  ORCAMENTO: "Orçamento",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const STATUS_SERVICO: { valor: StatusServico; rotulo: string }[] = [
  { valor: "ORCAMENTO", rotulo: "Orçamento" },
  { valor: "EM_ANDAMENTO", rotulo: "Em andamento" },
  { valor: "CONCLUIDO", rotulo: "Concluído" },
  { valor: "CANCELADO", rotulo: "Cancelado" },
];

export const ROTULO_REMUNERACAO: Record<TipoRemuneracao, string> = {
  SALARIO: "Salário",
  DIARIA: "Diária",
  COMISSAO: "Comissão",
};

export const TIPOS_REMUNERACAO: { valor: TipoRemuneracao; rotulo: string }[] = [
  { valor: "SALARIO", rotulo: "Salário (calcula pelos dias úteis)" },
  { valor: "DIARIA", rotulo: "Diária (valor fixo por dia)" },
  { valor: "COMISSAO", rotulo: "Comissão (% sobre o valor do serviço)" },
];

export const ROTULO_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  TERCEIRIZADO: "Terceirizado",
  COMBUSTIVEL: "Combustível",
  FERRAMENTA: "Ferramenta",
  ALIMENTACAO: "Alimentação",
  TRANSPORTE: "Transporte",
  OUTRO: "Outro",
};

export const CATEGORIAS_GASTO: { valor: CategoriaGasto; rotulo: string }[] = [
  { valor: "TERCEIRIZADO", rotulo: "Terceirizado" },
  { valor: "COMBUSTIVEL", rotulo: "Combustível" },
  { valor: "FERRAMENTA", rotulo: "Ferramenta" },
  { valor: "ALIMENTACAO", rotulo: "Alimentação" },
  { valor: "TRANSPORTE", rotulo: "Transporte" },
  { valor: "OUTRO", rotulo: "Outro" },
];
