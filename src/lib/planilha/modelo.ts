import ExcelJS from "exceljs";

import { EMPRESA } from "@/components/logo";

import {
  ABAS,
  CAMPOS_SERVICO,
  TABELAS,
  type Coluna,
} from "./colunas";

/**
 * Monta o modelo de planilha que o usuário baixa e preenche.
 *
 * Sai da mesma definição de colunas que o leitor usa, então o arquivo entregue
 * é sempre o que o sistema sabe ler.
 */

const AZUL = "FF101A29";
const VERMELHO = "FFE11D2A";
const CINZA = "FFF2F4F7";

function estiloCabecalho(celula: ExcelJS.Cell) {
  celula.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  celula.alignment = { vertical: "middle", horizontal: "left" };
  celula.border = {
    top: { style: "thin", color: { argb: "FF9AA8BD" } },
    left: { style: "thin", color: { argb: "FF9AA8BD" } },
    bottom: { style: "thin", color: { argb: "FF9AA8BD" } },
    right: { style: "thin", color: { argb: "FF9AA8BD" } },
  };
}

/** Marca visualmente o campo obrigatório, para não descobrir o erro só no envio. */
function tituloDaColuna(coluna: Coluna) {
  return coluna.obrigatoria ? `${coluna.titulo} *` : coluna.titulo;
}

function aplicarListaSuspensa(
  planilha: ExcelJS.Worksheet,
  endereco: string,
  opcoes: readonly string[],
) {
  planilha.getCell(endereco).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`"${opcoes.join(",")}"`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Valor fora da lista",
    error: `Use uma destas opções: ${opcoes.join(", ")}`,
  };
}

function montarAbaInstrucoes(livro: ExcelJS.Workbook) {
  const aba = livro.addWorksheet(ABAS.instrucoes, {
    properties: { tabColor: { argb: VERMELHO } },
  });
  aba.getColumn(1).width = 100;

  const linhas: [string, "titulo" | "texto" | "aviso"][] = [
    [`${EMPRESA.nome} — modelo de importação de serviço`, "titulo"],
    ["", "texto"],
    ["Preencha as abas e envie o arquivo em Serviços > Importar planilha.", "texto"],
    ["O sistema confere tudo e mostra o que será importado antes de gravar.", "texto"],
    ["", "texto"],
    ["NÃO renomeie as abas nem as colunas — é assim que o sistema encontra os dados.", "aviso"],
    ["", "texto"],
    ["Aba Serviço", "titulo"],
    ["Um campo por linha. Escreva o valor na coluna B, ao lado do nome do campo.", "texto"],
    ["Cliente, Veículo e Data de início são obrigatórios.", "texto"],
    ["", "texto"],
    ["Aba Produtos", "titulo"],
    ["Os produtos que JÁ foram usados neste serviço, com o preço que você pagou.", "texto"],
    ["O sistema registra a entrada e a saída no histórico do produto, mas o saldo", "texto"],
    ["e o custo médio atuais NÃO mudam — o custo do serviço é o preço da planilha.", "texto"],
    ["Produto que ainda não existe no cadastro é criado automaticamente.", "texto"],
    ["A coluna Total é opcional: serve só de conferência contra quantidade x preço.", "texto"],
    ["", "texto"],
    ["Abas Gastos e Equipe", "titulo"],
    ["Opcionais. Pode deixar em branco e lançar depois pelo sistema.", "texto"],
    ["Na Equipe, informe o período trabalhado; o sistema conta os dias úteis.", "texto"],
    ["", "texto"],
    ["Como escrever os valores", "titulo"],
    ["Datas: dd/mm/aaaa (ex.: 05/01/2026)", "texto"],
    ["Números: 1234,56 ou 1234.56 — não precisa escrever R$", "texto"],
    ["Linhas em branco no meio da tabela são ignoradas.", "texto"],
    ["", "texto"],
    ["A linha cinza de exemplo em cada aba pode ser apagada ou sobrescrita.", "texto"],
  ];

  for (const [texto, tipo] of linhas) {
    const linha = aba.addRow([texto]);
    const celula = linha.getCell(1);
    if (tipo === "titulo") {
      celula.font = { bold: true, size: 12, color: { argb: AZUL } };
    } else if (tipo === "aviso") {
      celula.font = { bold: true, color: { argb: VERMELHO } };
    }
  }

  return aba;
}

function montarAbaServico(livro: ExcelJS.Workbook) {
  const aba = livro.addWorksheet(ABAS.servico);
  aba.getColumn(1).width = 22;
  aba.getColumn(2).width = 34;
  aba.getColumn(3).width = 40;

  const cabecalho = aba.addRow(["Campo", "Valor", "Como preencher"]);
  cabecalho.eachCell(estiloCabecalho);
  aba.views = [{ state: "frozen", ySplit: 1 }];

  for (const campo of CAMPOS_SERVICO) {
    const linha = aba.addRow([
      tituloDaColuna(campo),
      campo.exemplo ?? "",
      campo.ajuda ?? (campo.opcoes ? campo.opcoes.join(" / ") : ""),
    ]);

    linha.getCell(1).font = { bold: campo.obrigatoria };
    linha.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: CINZA },
    };
    linha.getCell(3).font = { size: 9, color: { argb: "FF6B7A92" } };

    if (campo.opcoes) {
      aplicarListaSuspensa(aba, `B${linha.number}`, campo.opcoes);
    }
  }

  return aba;
}

function montarAbaTabela(
  livro: ExcelJS.Workbook,
  nome: string,
  colunas: Coluna[],
) {
  const aba = livro.addWorksheet(nome);

  aba.columns = colunas.map((coluna) => ({
    key: coluna.campo,
    width: coluna.largura,
  }));

  const cabecalho = aba.addRow(colunas.map(tituloDaColuna));
  cabecalho.eachCell(estiloCabecalho);
  aba.views = [{ state: "frozen", ySplit: 1 }];

  // Linha de exemplo, em cinza, para mostrar o formato esperado.
  const exemplo = aba.addRow(colunas.map((coluna) => coluna.exemplo ?? ""));
  exemplo.eachCell((celula) => {
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } };
    celula.font = { color: { argb: "FF6B7A92" }, italic: true };
  });

  // Listas suspensas valendo para as próximas 200 linhas.
  colunas.forEach((coluna, indice) => {
    if (!coluna.opcoes) return;
    const letra = aba.getColumn(indice + 1).letter;
    for (let linha = 2; linha <= 200; linha += 1) {
      aplicarListaSuspensa(aba, `${letra}${linha}`, coluna.opcoes);
    }
  });

  return aba;
}

/** Gera o arquivo `.xlsx` do modelo em memória. */
export async function gerarModelo(): Promise<Buffer> {
  const livro = new ExcelJS.Workbook();
  livro.creator = EMPRESA.nome;
  livro.created = new Date();

  montarAbaInstrucoes(livro);
  montarAbaServico(livro);
  for (const tabela of TABELAS) {
    montarAbaTabela(livro, tabela.aba, [...tabela.colunas]);
  }

  const dados = await livro.xlsx.writeBuffer();
  return Buffer.from(dados);
}
