import ExcelJS from "exceljs";

import { Decimal, dec, parseDecimalBR } from "@/lib/decimal";
import { conferirTotal } from "@/lib/domain/importacao";
import {
  CATEGORIAS_GASTO,
  STATUS_SERVICO,
  TIPOS_REMUNERACAO,
  UNIDADES,
} from "@/lib/rotulos";

import {
  ABAS,
  CAMPOS_SERVICO,
  COLUNAS_EQUIPE,
  COLUNAS_GASTOS,
  COLUNAS_PRODUTOS,
  normalizar,
  type Coluna,
} from "./colunas";

/**
 * Leitura e conferência da planilha enviada.
 *
 * A regra é uma só: nada é gravado enquanto houver um erro. Por isso o leitor
 * junta **todos** os problemas em vez de parar no primeiro, e cada um aponta
 * aba, linha e coluna — quem preencheu precisa saber onde corrigir.
 */

export type ProblemaPlanilha = {
  aba: string;
  /** Linha da planilha, contando o cabeçalho. `null` quando é da aba inteira. */
  linha: number | null;
  coluna: string | null;
  mensagem: string;
};

export type ProdutoLido = {
  linha: number;
  produto: string;
  codigo: string | null;
  unidade: string;
  quantidade: Decimal;
  precoUnitario: Decimal;
  custoTotal: Decimal;
  data: Date | null;
  observacao: string | null;
};

export type GastoLido = {
  linha: number;
  descricao: string;
  categoria: string;
  valor: Decimal;
  data: Date | null;
};

export type EquipeLida = {
  linha: number;
  funcionario: string;
  remuneracao: "SALARIO" | "DIARIA" | "COMISSAO";
  salarioMensal: Decimal | null;
  valorDiaria: Decimal | null;
  percentualComissao: Decimal | null;
  diaInicial: Date | null;
  diaFinal: Date | null;
  incluirFimDeSemana: boolean;
};

export type ServicoLido = {
  cliente: string;
  telefone: string | null;
  veiculo: string;
  placa: string | null;
  descricao: string | null;
  valorOrcado: Decimal;
  status: "ORCAMENTO" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";
  dataInicio: Date;
  dataConclusao: Date | null;
  observacao: string | null;
};

export type PlanilhaLida = {
  servico: ServicoLido;
  produtos: ProdutoLido[];
  gastos: GastoLido[];
  equipe: EquipeLida[];
  /** Não impedem a importação, mas o usuário precisa ver. */
  avisos: ProblemaPlanilha[];
};

export type ResultadoLeitura =
  | { ok: true; dados: PlanilhaLida; avisos: ProblemaPlanilha[] }
  | { ok: false; erros: ProblemaPlanilha[]; avisos: ProblemaPlanilha[] };

/** Junta os problemas encontrados, mantendo a ordem em que aparecem. */
class Coletor {
  readonly erros: ProblemaPlanilha[] = [];
  readonly avisos: ProblemaPlanilha[] = [];

  erro(aba: string, linha: number | null, coluna: string | null, mensagem: string) {
    this.erros.push({ aba, linha, coluna, mensagem });
  }

  aviso(aba: string, linha: number | null, coluna: string | null, mensagem: string) {
    this.avisos.push({ aba, linha, coluna, mensagem });
  }
}

// ---------------------------------------------------------------------------
// Leitura de célula
// ---------------------------------------------------------------------------

/**
 * Texto de uma célula, atravessando as formas que o Excel usa para guardar
 * conteúdo: texto puro, texto rico, fórmula com resultado e hiperlink.
 */
function textoDaCelula(celula: ExcelJS.Cell | undefined): string {
  const valor = celula?.value;
  if (valor === null || valor === undefined) return "";

  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  if (valor instanceof Date) return valor.toISOString();

  if (typeof valor === "object") {
    if ("richText" in valor && Array.isArray(valor.richText)) {
      return valor.richText.map((parte) => parte.text).join("").trim();
    }
    if ("text" in valor && typeof valor.text === "string") return valor.text.trim();
    if ("result" in valor) return String(valor.result ?? "").trim();
    if ("hyperlink" in valor && typeof valor.hyperlink === "string") {
      return valor.hyperlink.trim();
    }
  }

  return String(valor).trim();
}

function vazia(celula: ExcelJS.Cell | undefined): boolean {
  return textoDaCelula(celula) === "";
}

/** Número da célula, aceitando tanto valor numérico quanto texto digitado. */
function numeroDaCelula(celula: ExcelJS.Cell | undefined): Decimal | null {
  const valor = celula?.value;
  if (typeof valor === "number") return new Decimal(valor);
  if (
    valor &&
    typeof valor === "object" &&
    "result" in valor &&
    typeof valor.result === "number"
  ) {
    return new Decimal(valor.result);
  }
  return parseDecimalBR(textoDaCelula(celula));
}

/**
 * Data da célula. Aceita data de verdade do Excel e texto dd/mm/aaaa,
 * normalizando para meia-noite em UTC — como o banco guarda.
 */
function dataDaCelula(celula: ExcelJS.Cell | undefined): Date | "invalida" | null {
  const valor = celula?.value;
  if (valor === null || valor === undefined) return null;

  if (valor instanceof Date) {
    return new Date(
      Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()),
    );
  }

  const texto = textoDaCelula(celula);
  if (texto === "") return null;

  const brasileiro = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brasileiro) {
    const [, dia, mes, ano] = brasileiro;
    const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
    // Rejeita 31/02 e companhia, que o Date "conserta" sozinho.
    if (data.getUTCMonth() !== Number(mes) - 1 || data.getUTCDate() !== Number(dia)) {
      return "invalida";
    }
    return data;
  }

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const data = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
    return Number.isNaN(data.getTime()) ? "invalida" : data;
  }

  return "invalida";
}

/** Acha a opção correspondente comparando sem acento nem maiúsculas. */
function casarOpcao(texto: string, opcoes: readonly string[]): string | null {
  const alvo = normalizar(texto);
  return opcoes.find((opcao) => normalizar(opcao) === alvo) ?? null;
}

// ---------------------------------------------------------------------------
// Estrutura das abas
// ---------------------------------------------------------------------------

function acharAba(
  livro: ExcelJS.Workbook,
  nome: string,
): ExcelJS.Worksheet | undefined {
  const alvo = normalizar(nome);
  return livro.worksheets.find((aba) => normalizar(aba.name) === alvo);
}

/**
 * Mapeia cada coluna esperada para o índice em que ela aparece na planilha.
 * A ordem das colunas não importa, e colunas a mais são ignoradas.
 */
function mapearColunas(
  aba: ExcelJS.Worksheet,
  colunas: Coluna[],
  coletor: Coletor,
): Map<string, number> | null {
  const cabecalho = aba.getRow(1);
  const encontradas = new Map<string, number>();

  const titulosNaPlanilha = new Map<string, number>();
  cabecalho.eachCell({ includeEmpty: false }, (celula, indice) => {
    // O modelo marca obrigatoriedade com " *"; isso não faz parte do nome.
    const nome = normalizar(textoDaCelula(celula).replace(/\*+$/, ""));
    if (nome && !titulosNaPlanilha.has(nome)) titulosNaPlanilha.set(nome, indice);
  });

  const faltando: string[] = [];
  for (const coluna of colunas) {
    const indice = titulosNaPlanilha.get(normalizar(coluna.titulo));
    if (indice) encontradas.set(coluna.campo, indice);
    else if (coluna.obrigatoria) faltando.push(coluna.titulo);
  }

  if (faltando.length > 0) {
    coletor.erro(
      aba.name,
      1,
      faltando.join(", "),
      `Coluna obrigatória não encontrada no cabeçalho: ${faltando.join(", ")}. Baixe o modelo e confira os nomes.`,
    );
    return null;
  }

  return encontradas;
}

/** `true` se a linha inteira está em branco nas colunas que interessam. */
function linhaVazia(linha: ExcelJS.Row, colunas: Map<string, number>): boolean {
  for (const indice of colunas.values()) {
    if (!vazia(linha.getCell(indice))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Aba Serviço
// ---------------------------------------------------------------------------

function lerServico(
  livro: ExcelJS.Workbook,
  coletor: Coletor,
): ServicoLido | null {
  const aba = acharAba(livro, ABAS.servico);
  if (!aba) {
    coletor.erro(
      ABAS.servico,
      null,
      null,
      `A planilha não tem a aba "${ABAS.servico}". Baixe o modelo e use o arquivo dele.`,
    );
    return null;
  }

  // Campo por linha: nome na coluna A, valor na coluna B.
  const valores = new Map<string, { texto: string; celula: ExcelJS.Cell; linha: number }>();
  aba.eachRow((linha, numero) => {
    const nome = normalizar(textoDaCelula(linha.getCell(1)).replace(/\*+$/, ""));
    if (!nome) return;
    const celula = linha.getCell(2);
    if (!valores.has(nome)) {
      valores.set(nome, { texto: textoDaCelula(celula), celula, linha: numero });
    }
  });

  function campo(nomeDoCampo: string) {
    const definicao = CAMPOS_SERVICO.find((c) => c.campo === nomeDoCampo);
    if (!definicao) return undefined;
    return valores.get(normalizar(definicao.titulo));
  }

  function exigirTexto(nomeDoCampo: string, titulo: string): string | null {
    const encontrado = campo(nomeDoCampo);
    if (!encontrado || encontrado.texto === "") {
      coletor.erro(
        aba!.name,
        encontrado?.linha ?? null,
        titulo,
        `${titulo} é obrigatório.`,
      );
      return null;
    }
    return encontrado.texto;
  }

  function opcional(nomeDoCampo: string): string | null {
    const encontrado = campo(nomeDoCampo);
    return encontrado && encontrado.texto !== "" ? encontrado.texto : null;
  }

  const cliente = exigirTexto("cliente", "Cliente");
  const veiculo = exigirTexto("veiculo", "Veículo");

  // Data de início
  const campoInicio = campo("dataInicio");
  let dataInicio: Date | null = null;
  if (!campoInicio || campoInicio.texto === "") {
    coletor.erro(aba.name, campoInicio?.linha ?? null, "Data de início", "Data de início é obrigatória.");
  } else {
    const lida = dataDaCelula(campoInicio.celula);
    if (lida === "invalida" || lida === null) {
      coletor.erro(
        aba.name,
        campoInicio.linha,
        "Data de início",
        `Data de início não foi entendida ("${campoInicio.texto}"). Use dd/mm/aaaa.`,
      );
    } else {
      dataInicio = lida;
    }
  }

  // Data de conclusão
  const campoConclusao = campo("dataConclusao");
  let dataConclusao: Date | null = null;
  if (campoConclusao && campoConclusao.texto !== "") {
    const lida = dataDaCelula(campoConclusao.celula);
    if (lida === "invalida") {
      coletor.erro(
        aba.name,
        campoConclusao.linha,
        "Data de conclusão",
        `Data de conclusão não foi entendida ("${campoConclusao.texto}"). Use dd/mm/aaaa.`,
      );
    } else {
      dataConclusao = lida;
    }
  }

  // Valor orçado
  const campoOrcado = campo("valorOrcado");
  let valorOrcado = new Decimal(0);
  if (campoOrcado && campoOrcado.texto !== "") {
    const numero = numeroDaCelula(campoOrcado.celula);
    if (numero === null) {
      coletor.erro(
        aba.name,
        campoOrcado.linha,
        "Valor orçado",
        `Valor orçado não é um número ("${campoOrcado.texto}").`,
      );
    } else if (numero.lt(0)) {
      coletor.erro(aba.name, campoOrcado.linha, "Valor orçado", "Valor orçado não pode ser negativo.");
    } else {
      valorOrcado = numero;
    }
  }

  // Situação
  const campoStatus = campo("status");
  let status: ServicoLido["status"] = "EM_ANDAMENTO";
  if (campoStatus && campoStatus.texto !== "") {
    const rotulo = casarOpcao(
      campoStatus.texto,
      STATUS_SERVICO.map((s) => s.rotulo),
    );
    const porValor = casarOpcao(
      campoStatus.texto,
      STATUS_SERVICO.map((s) => s.valor),
    );
    const escolhido =
      STATUS_SERVICO.find((s) => s.rotulo === rotulo || s.valor === porValor) ?? null;

    if (!escolhido) {
      coletor.erro(
        aba.name,
        campoStatus.linha,
        "Situação",
        `Situação "${campoStatus.texto}" não existe. Use: ${STATUS_SERVICO.map((s) => s.rotulo).join(", ")}.`,
      );
    } else {
      status = escolhido.valor;
    }
  }

  if (!cliente || !veiculo || !dataInicio) return null;

  if (dataConclusao && dataConclusao < dataInicio) {
    coletor.erro(
      aba.name,
      campoConclusao?.linha ?? null,
      "Data de conclusão",
      "Data de conclusão é anterior à data de início.",
    );
  }

  return {
    cliente,
    telefone: opcional("telefone"),
    veiculo,
    placa: opcional("placa")?.toUpperCase() ?? null,
    descricao: opcional("descricao"),
    valorOrcado,
    status,
    dataInicio,
    dataConclusao,
    observacao: opcional("observacao"),
  };
}

// ---------------------------------------------------------------------------
// Aba Produtos
// ---------------------------------------------------------------------------

function lerProdutos(
  livro: ExcelJS.Workbook,
  coletor: Coletor,
): ProdutoLido[] {
  const aba = acharAba(livro, ABAS.produtos);
  if (!aba) {
    coletor.erro(
      ABAS.produtos,
      null,
      null,
      `A planilha não tem a aba "${ABAS.produtos}". Baixe o modelo e use o arquivo dele.`,
    );
    return [];
  }

  const colunas = mapearColunas(aba, COLUNAS_PRODUTOS, coletor);
  if (!colunas) return [];

  const lidos: ProdutoLido[] = [];
  const nomesVistos = new Map<string, number>();

  aba.eachRow((linha, numero) => {
    if (numero === 1) return;
    if (linhaVazia(linha, colunas)) return;

    const celula = (campo: string) => {
      const indice = colunas.get(campo);
      return indice ? linha.getCell(indice) : undefined;
    };

    const nome = textoDaCelula(celula("produto"));
    if (nome === "") {
      coletor.erro(aba.name, numero, "Produto", "Produto é obrigatório nesta linha.");
      return;
    }

    // Unidade
    const textoUnidade = textoDaCelula(celula("unidade"));
    const unidade = casarOpcao(
      textoUnidade,
      UNIDADES.map((u) => u.valor),
    );
    if (!unidade) {
      coletor.erro(
        aba.name,
        numero,
        "Unidade",
        textoUnidade === ""
          ? "Unidade é obrigatória."
          : `Unidade "${textoUnidade}" não existe. Use: ${UNIDADES.map((u) => u.valor).join(", ")}.`,
      );
    }

    // Quantidade
    const quantidade = numeroDaCelula(celula("quantidade"));
    if (quantidade === null) {
      coletor.erro(
        aba.name,
        numero,
        "Quantidade",
        `Quantidade não é um número ("${textoDaCelula(celula("quantidade"))}").`,
      );
    } else if (quantidade.lte(0)) {
      coletor.erro(aba.name, numero, "Quantidade", "Quantidade precisa ser maior que zero.");
    }

    // Preço unitário
    const preco = numeroDaCelula(celula("precoUnitario"));
    if (preco === null) {
      coletor.erro(
        aba.name,
        numero,
        "Preço unitário",
        `Preço unitário não é um número ("${textoDaCelula(celula("precoUnitario"))}").`,
      );
    } else if (preco.lt(0)) {
      coletor.erro(aba.name, numero, "Preço unitário", "Preço unitário não pode ser negativo.");
    }

    // Data
    const dataLida = dataDaCelula(celula("data"));
    if (dataLida === "invalida") {
      coletor.erro(
        aba.name,
        numero,
        "Data",
        `Data não foi entendida ("${textoDaCelula(celula("data"))}"). Use dd/mm/aaaa.`,
      );
    }

    if (!unidade || quantidade === null || quantidade.lte(0) || preco === null || preco.lt(0)) {
      return;
    }

    // Conferência do total informado
    const totalInformado = numeroDaCelula(celula("total"));
    const conferencia = conferirTotal({
      quantidade,
      precoUnitario: preco,
      totalInformado,
    });

    if (conferencia.divergente) {
      coletor.erro(
        aba.name,
        numero,
        "Total",
        `Total informado (${totalInformado?.toFixed(2)}) não bate com quantidade × preço (${conferencia.total.toFixed(2)}). Confira a linha.`,
      );
      return;
    }

    if (conferencia.diferenca && conferencia.diferenca.gt(0)) {
      coletor.aviso(
        aba.name,
        numero,
        "Total",
        `Diferença de arredondamento de R$ ${conferencia.diferenca.toFixed(2)}; será usado ${conferencia.total.toFixed(2)}.`,
      );
    }

    const chave = normalizar(nome);
    const jaVista = nomesVistos.get(chave);
    if (jaVista) {
      coletor.aviso(
        aba.name,
        numero,
        "Produto",
        `"${nome}" também aparece na linha ${jaVista}; as duas serão lançadas.`,
      );
    } else {
      nomesVistos.set(chave, numero);
    }

    lidos.push({
      linha: numero,
      produto: nome,
      codigo: textoDaCelula(celula("codigo")) || null,
      unidade,
      quantidade,
      precoUnitario: preco,
      custoTotal: conferencia.total,
      data: dataLida === "invalida" ? null : dataLida,
      observacao: textoDaCelula(celula("observacao")) || null,
    });
  });

  if (lidos.length === 0 && coletor.erros.length === 0) {
    coletor.erro(
      aba.name,
      null,
      null,
      "Nenhum produto preenchido. Informe ao menos um produto usado no serviço.",
    );
  }

  return lidos;
}

// ---------------------------------------------------------------------------
// Aba Gastos
// ---------------------------------------------------------------------------

function lerGastos(livro: ExcelJS.Workbook, coletor: Coletor): GastoLido[] {
  const aba = acharAba(livro, ABAS.gastos);
  if (!aba) return [];

  const colunas = mapearColunas(aba, COLUNAS_GASTOS, coletor);
  if (!colunas) return [];

  const lidos: GastoLido[] = [];

  aba.eachRow((linha, numero) => {
    if (numero === 1) return;
    if (linhaVazia(linha, colunas)) return;

    const celula = (campo: string) => {
      const indice = colunas.get(campo);
      return indice ? linha.getCell(indice) : undefined;
    };

    const descricao = textoDaCelula(celula("descricao"));
    if (descricao === "") {
      coletor.erro(aba.name, numero, "Descrição", "Descrição é obrigatória nesta linha.");
      return;
    }

    const textoCategoria = textoDaCelula(celula("categoria"));
    const rotulo = casarOpcao(
      textoCategoria,
      CATEGORIAS_GASTO.map((c) => c.rotulo),
    );
    const escolhida =
      CATEGORIAS_GASTO.find(
        (c) => c.rotulo === rotulo || normalizar(c.valor) === normalizar(textoCategoria),
      ) ?? null;

    if (!escolhida) {
      coletor.erro(
        aba.name,
        numero,
        "Categoria",
        textoCategoria === ""
          ? "Categoria é obrigatória."
          : `Categoria "${textoCategoria}" não existe. Use: ${CATEGORIAS_GASTO.map((c) => c.rotulo).join(", ")}.`,
      );
    }

    const valor = numeroDaCelula(celula("valor"));
    if (valor === null) {
      coletor.erro(
        aba.name,
        numero,
        "Valor",
        `Valor não é um número ("${textoDaCelula(celula("valor"))}").`,
      );
    } else if (valor.lte(0)) {
      coletor.erro(aba.name, numero, "Valor", "Valor precisa ser maior que zero.");
    }

    const dataLida = dataDaCelula(celula("data"));
    if (dataLida === "invalida") {
      coletor.erro(
        aba.name,
        numero,
        "Data",
        `Data não foi entendida ("${textoDaCelula(celula("data"))}"). Use dd/mm/aaaa.`,
      );
    }

    if (!escolhida || valor === null || valor.lte(0)) return;

    lidos.push({
      linha: numero,
      descricao,
      categoria: escolhida.valor,
      valor,
      data: dataLida === "invalida" ? null : dataLida,
    });
  });

  return lidos;
}

// ---------------------------------------------------------------------------
// Aba Equipe
// ---------------------------------------------------------------------------

function lerEquipe(livro: ExcelJS.Workbook, coletor: Coletor): EquipeLida[] {
  const aba = acharAba(livro, ABAS.equipe);
  if (!aba) return [];

  const colunas = mapearColunas(aba, COLUNAS_EQUIPE, coletor);
  if (!colunas) return [];

  const lidos: EquipeLida[] = [];
  const nomesVistos = new Set<string>();

  aba.eachRow((linha, numero) => {
    if (numero === 1) return;
    if (linhaVazia(linha, colunas)) return;

    const celula = (campo: string) => {
      const indice = colunas.get(campo);
      return indice ? linha.getCell(indice) : undefined;
    };

    const nome = textoDaCelula(celula("funcionario"));
    if (nome === "") {
      coletor.erro(aba.name, numero, "Funcionário", "Funcionário é obrigatório nesta linha.");
      return;
    }

    if (nomesVistos.has(normalizar(nome))) {
      coletor.erro(
        aba.name,
        numero,
        "Funcionário",
        `"${nome}" aparece mais de uma vez. Uma pessoa só pode ser vinculada uma vez ao serviço.`,
      );
      return;
    }
    nomesVistos.add(normalizar(nome));

    const textoRemuneracao = textoDaCelula(celula("remuneracao"));
    const tipo = TIPOS_REMUNERACAO.find(
      (t) =>
        normalizar(t.valor) === normalizar(textoRemuneracao) ||
        normalizar(t.rotulo) === normalizar(textoRemuneracao) ||
        normalizar(t.rotulo).startsWith(normalizar(textoRemuneracao)),
    );

    if (!tipo || textoRemuneracao === "") {
      coletor.erro(
        aba.name,
        numero,
        "Remuneração",
        textoRemuneracao === ""
          ? "Remuneração é obrigatória."
          : `Remuneração "${textoRemuneracao}" não existe. Use: ${TIPOS_REMUNERACAO.map((t) => t.valor).join(", ")}.`,
      );
      return;
    }

    const numeroOpcional = (campo: string, titulo: string): Decimal | null => {
      const texto = textoDaCelula(celula(campo));
      if (texto === "") return null;

      const valor = numeroDaCelula(celula(campo));
      if (valor === null) {
        coletor.erro(aba.name, numero, titulo, `${titulo} não é um número ("${texto}").`);
        return null;
      }
      if (valor.lte(0)) {
        coletor.erro(aba.name, numero, titulo, `${titulo} precisa ser maior que zero.`);
        return null;
      }
      return valor;
    };

    const salarioMensal = numeroOpcional("salarioMensal", "Salário mensal");
    const valorDiaria = numeroOpcional("valorDiaria", "Valor da diária");
    const percentualComissao = numeroOpcional("percentualComissao", "Comissão (%)");

    if (tipo.valor === "SALARIO" && !salarioMensal) {
      coletor.erro(aba.name, numero, "Salário mensal", "Remuneração por salário exige o salário mensal.");
      return;
    }
    if (tipo.valor === "DIARIA" && !valorDiaria) {
      coletor.erro(aba.name, numero, "Valor da diária", "Remuneração por diária exige o valor da diária.");
      return;
    }
    if (tipo.valor === "COMISSAO" && !percentualComissao) {
      coletor.erro(aba.name, numero, "Comissão (%)", "Remuneração por comissão exige o percentual.");
      return;
    }

    const inicial = dataDaCelula(celula("diaInicial"));
    const final = dataDaCelula(celula("diaFinal"));

    for (const [lida, titulo] of [
      [inicial, "Dia inicial"],
      [final, "Dia final"],
    ] as const) {
      if (lida === "invalida") {
        coletor.erro(aba.name, numero, titulo, `${titulo} não foi entendido. Use dd/mm/aaaa.`);
      }
    }

    const diaInicial = inicial === "invalida" ? null : inicial;
    const diaFinal = final === "invalida" ? null : final;

    if (diaInicial && diaFinal && diaFinal < diaInicial) {
      coletor.erro(aba.name, numero, "Dia final", "Dia final é anterior ao dia inicial.");
      return;
    }
    if (!diaInicial && diaFinal) {
      coletor.erro(aba.name, numero, "Dia inicial", "Informe o dia inicial junto com o dia final.");
      return;
    }
    if (tipo.valor !== "COMISSAO" && !diaInicial) {
      coletor.aviso(
        aba.name,
        numero,
        "Dia inicial",
        `Sem dias lançados, ${nome} entra no serviço com custo zero.`,
      );
    }

    const fimDeSemana = normalizar(textoDaCelula(celula("incluirFimDeSemana")));

    lidos.push({
      linha: numero,
      funcionario: nome,
      remuneracao: tipo.valor,
      salarioMensal,
      valorDiaria,
      percentualComissao,
      diaInicial,
      diaFinal,
      incluirFimDeSemana: fimDeSemana === "sim" || fimDeSemana === "s" || fimDeSemana === "true",
    });
  });

  return lidos;
}

// ---------------------------------------------------------------------------
// Entrada pública
// ---------------------------------------------------------------------------

/** Tamanho máximo aceito, bem acima de uma planilha de serviço real. */
export const TAMANHO_MAXIMO = 3 * 1024 * 1024;

export async function lerPlanilha(arquivo: ArrayBuffer): Promise<ResultadoLeitura> {
  const coletor = new Coletor();

  if (arquivo.byteLength === 0) {
    return {
      ok: false,
      erros: [{ aba: "-", linha: null, coluna: null, mensagem: "O arquivo está vazio." }],
      avisos: [],
    };
  }
  if (arquivo.byteLength > TAMANHO_MAXIMO) {
    return {
      ok: false,
      erros: [
        {
          aba: "-",
          linha: null,
          coluna: null,
          mensagem: "O arquivo passa de 3 MB. Envie apenas a planilha do serviço.",
        },
      ],
      avisos: [],
    };
  }

  const livro = new ExcelJS.Workbook();
  try {
    await livro.xlsx.load(arquivo);
  } catch {
    return {
      ok: false,
      erros: [
        {
          aba: "-",
          linha: null,
          coluna: null,
          mensagem:
            "Não foi possível abrir o arquivo. Ele precisa ser uma planilha .xlsx — se for .xls ou .csv, abra no Excel e salve como .xlsx.",
        },
      ],
      avisos: [],
    };
  }

  if (livro.worksheets.length === 0) {
    return {
      ok: false,
      erros: [
        { aba: "-", linha: null, coluna: null, mensagem: "A planilha não tem nenhuma aba." },
      ],
      avisos: [],
    };
  }

  const servico = lerServico(livro, coletor);
  const produtos = lerProdutos(livro, coletor);
  const gastos = lerGastos(livro, coletor);
  const equipe = lerEquipe(livro, coletor);

  if (coletor.erros.length > 0 || !servico) {
    return { ok: false, erros: coletor.erros, avisos: coletor.avisos };
  }

  // Data de lançamento em branco herda a data de início do serviço.
  const comData = <T extends { data: Date | null }>(itens: T[]) =>
    itens.map((item) => ({ ...item, data: item.data ?? servico.dataInicio }));

  return {
    ok: true,
    dados: {
      servico,
      produtos: comData(produtos),
      gastos: comData(gastos),
      equipe,
      avisos: coletor.avisos,
    },
    avisos: coletor.avisos,
  };
}

/** Soma dos produtos lidos, para a pré-visualização. */
export function totalDosProdutos(produtos: ProdutoLido[]): Decimal {
  return produtos.reduce((soma, produto) => soma.plus(produto.custoTotal), dec(0));
}
