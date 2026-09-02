import {
  CATEGORIAS_GASTO,
  STATUS_SERVICO,
  TIPOS_REMUNERACAO,
  UNIDADES,
} from "@/lib/rotulos";

/**
 * Definição das abas e colunas da planilha de serviço.
 *
 * Este arquivo é usado tanto para **gerar** o modelo quanto para **ler** o
 * arquivo enviado. Mantendo os dois lados na mesma fonte, o modelo e o leitor
 * não têm como divergir — que é o jeito clássico de uma importação quebrar.
 */

/**
 * Normaliza um nome de aba ou de coluna para comparação: sem acento, sem
 * maiúsculas e sem espaço sobrando. É o que permite "Preço unitário",
 * "PRECO UNITARIO" e "preço  unitário " caírem no mesmo campo.
 */
export function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .normalize("NFD")
    // Faixa dos sinais diacríticos combinantes que o NFD separa das letras.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const ABAS = {
  servico: "Serviço",
  produtos: "Produtos",
  gastos: "Gastos",
  equipe: "Equipe",
  instrucoes: "Instruções",
} as const;

export type Coluna = {
  /** Chave usada no código. */
  campo: string;
  /** Cabeçalho como aparece na planilha. */
  titulo: string;
  obrigatoria: boolean;
  largura: number;
  /** Quando presente, o valor precisa ser um destes (comparado sem acento). */
  opcoes?: readonly string[];
  /** Texto de exemplo na linha de demonstração do modelo. */
  exemplo?: string | number;
  ajuda?: string;
};

const OPCOES_UNIDADE = UNIDADES.map((u) => u.valor);
const OPCOES_STATUS = STATUS_SERVICO.map((s) => s.rotulo);
const OPCOES_CATEGORIA = CATEGORIAS_GASTO.map((c) => c.rotulo);
const OPCOES_REMUNERACAO = TIPOS_REMUNERACAO.map((t) => t.valor);

export { OPCOES_UNIDADE, OPCOES_STATUS, OPCOES_CATEGORIA, OPCOES_REMUNERACAO };

/**
 * Aba Serviço: um campo por linha, nome na coluna A e valor na coluna B.
 * Formato vertical porque é um registro só — tabela aqui seria desconfortável
 * de preencher.
 */
export const CAMPOS_SERVICO: Coluna[] = [
  {
    campo: "cliente",
    titulo: "Cliente",
    obrigatoria: true,
    largura: 24,
    exemplo: "Transportes Silva",
  },
  {
    campo: "telefone",
    titulo: "Telefone",
    obrigatoria: false,
    largura: 24,
    exemplo: "(66) 99999-0000",
  },
  {
    campo: "veiculo",
    titulo: "Veículo",
    obrigatoria: true,
    largura: 24,
    exemplo: "Scania R450 2019",
  },
  { campo: "placa", titulo: "Placa", obrigatoria: false, largura: 24, exemplo: "ABC1D23" },
  {
    campo: "descricao",
    titulo: "Descrição",
    obrigatoria: false,
    largura: 24,
    exemplo: "Pintura completa da cabine",
  },
  {
    campo: "valorOrcado",
    titulo: "Valor orçado",
    obrigatoria: false,
    largura: 24,
    exemplo: 8000,
    ajuda: "Só números. Ex.: 8000 ou 8.000,00",
  },
  {
    campo: "status",
    titulo: "Situação",
    obrigatoria: false,
    largura: 24,
    opcoes: OPCOES_STATUS,
    exemplo: "Em andamento",
    ajuda: "Em branco assume Em andamento",
  },
  {
    campo: "dataInicio",
    titulo: "Data de início",
    obrigatoria: true,
    largura: 24,
    exemplo: "05/01/2026",
    ajuda: "dd/mm/aaaa",
  },
  {
    campo: "dataConclusao",
    titulo: "Data de conclusão",
    obrigatoria: false,
    largura: 24,
    ajuda: "Deixe em branco se o serviço está aberto",
  },
  {
    campo: "observacao",
    titulo: "Observação",
    obrigatoria: false,
    largura: 24,
    exemplo: "Importado da planilha antiga",
  },
];

export const COLUNAS_PRODUTOS: Coluna[] = [
  {
    campo: "produto",
    titulo: "Produto",
    obrigatoria: true,
    largura: 30,
    exemplo: "Tinta PU Branca",
  },
  { campo: "codigo", titulo: "Código", obrigatoria: false, largura: 14, exemplo: "TIN-001" },
  {
    campo: "unidade",
    titulo: "Unidade",
    obrigatoria: true,
    largura: 12,
    opcoes: OPCOES_UNIDADE,
    exemplo: "L",
  },
  { campo: "quantidade", titulo: "Quantidade", obrigatoria: true, largura: 14, exemplo: 10 },
  {
    campo: "precoUnitario",
    titulo: "Preço unitário",
    obrigatoria: true,
    largura: 16,
    exemplo: 60,
  },
  {
    campo: "total",
    titulo: "Total",
    obrigatoria: false,
    largura: 14,
    exemplo: 600,
    ajuda: "Opcional. Serve de conferência",
  },
  {
    campo: "data",
    titulo: "Data",
    obrigatoria: false,
    largura: 14,
    exemplo: "08/01/2026",
    ajuda: "Em branco usa a data de início",
  },
  { campo: "observacao", titulo: "Observação", obrigatoria: false, largura: 26 },
];

export const COLUNAS_GASTOS: Coluna[] = [
  {
    campo: "descricao",
    titulo: "Descrição",
    obrigatoria: true,
    largura: 32,
    exemplo: "Retífica do cabeçote",
  },
  {
    campo: "categoria",
    titulo: "Categoria",
    obrigatoria: true,
    largura: 18,
    opcoes: OPCOES_CATEGORIA,
    exemplo: "Terceirizado",
  },
  { campo: "valor", titulo: "Valor", obrigatoria: true, largura: 14, exemplo: 150 },
  {
    campo: "data",
    titulo: "Data",
    obrigatoria: false,
    largura: 14,
    exemplo: "10/01/2026",
    ajuda: "Em branco usa a data de início",
  },
];

export const COLUNAS_EQUIPE: Coluna[] = [
  {
    campo: "funcionario",
    titulo: "Funcionário",
    obrigatoria: true,
    largura: 26,
    exemplo: "Carlos Pereira",
  },
  {
    campo: "remuneracao",
    titulo: "Remuneração",
    obrigatoria: true,
    largura: 16,
    opcoes: OPCOES_REMUNERACAO,
    exemplo: "SALARIO",
  },
  {
    campo: "salarioMensal",
    titulo: "Salário mensal",
    obrigatoria: false,
    largura: 16,
    exemplo: 2200,
  },
  { campo: "valorDiaria", titulo: "Valor da diária", obrigatoria: false, largura: 16 },
  { campo: "percentualComissao", titulo: "Comissão (%)", obrigatoria: false, largura: 14 },
  {
    campo: "diaInicial",
    titulo: "Dia inicial",
    obrigatoria: false,
    largura: 14,
    exemplo: "05/01/2026",
  },
  {
    campo: "diaFinal",
    titulo: "Dia final",
    obrigatoria: false,
    largura: 14,
    exemplo: "09/01/2026",
  },
  {
    campo: "incluirFimDeSemana",
    titulo: "Incluir fim de semana",
    obrigatoria: false,
    largura: 22,
    opcoes: ["Sim", "Não"],
    exemplo: "Não",
  },
];

/** Aba de tabela: cabeçalho na linha 1, dados a partir da linha 2. */
export const TABELAS = [
  { aba: ABAS.produtos, colunas: COLUNAS_PRODUTOS, obrigatoria: true },
  { aba: ABAS.gastos, colunas: COLUNAS_GASTOS, obrigatoria: false },
  { aba: ABAS.equipe, colunas: COLUNAS_EQUIPE, obrigatoria: false },
] as const;

export const NOME_ARQUIVO_MODELO = "modelo-servico-lanius.xlsx";
