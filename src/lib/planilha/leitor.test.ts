import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { lerPlanilha, type ProblemaPlanilha } from "./leitor";
import { gerarModelo } from "./modelo";

/**
 * Os testes montam planilhas em memória, do jeito certo e do jeito torto, e
 * conferem que o leitor aponta exatamente onde está o problema — sem nunca
 * estourar exceção para o usuário.
 */

type LinhaProduto = (string | number)[];

/** Monta uma planilha válida e deixa alterar qualquer parte para testar o erro. */
async function montar(opcoes?: {
  abaServico?: string;
  abaProdutos?: string;
  campos?: (string | number)[][];
  cabecalhoProdutos?: string[];
  produtos?: LinhaProduto[];
  gastos?: (string | number)[][];
  equipe?: (string | number)[][];
  semAbaProdutos?: boolean;
}): Promise<ArrayBuffer> {
  const livro = new ExcelJS.Workbook();

  const servico = livro.addWorksheet(opcoes?.abaServico ?? "Serviço");
  const campos = opcoes?.campos ?? [
    ["Cliente", "Transportes Silva"],
    ["Veículo", "Scania R450 2019"],
    ["Placa", "abc1d23"],
    ["Valor orçado", 8000],
    ["Situação", "Em andamento"],
    ["Data de início", "05/01/2026"],
  ];
  servico.addRow(["Campo", "Valor"]);
  for (const linha of campos) servico.addRow(linha);

  if (!opcoes?.semAbaProdutos) {
    const produtos = livro.addWorksheet(opcoes?.abaProdutos ?? "Produtos");
    produtos.addRow(
      opcoes?.cabecalhoProdutos ?? [
        "Produto",
        "Código",
        "Unidade",
        "Quantidade",
        "Preço unitário",
        "Total",
        "Data",
        "Observação",
      ],
    );
    const linhas = opcoes?.produtos ?? [
      ["Tinta PU Branca", "TIN-001", "L", 10, 60, 600, "08/01/2026", ""],
    ];
    for (const linha of linhas) produtos.addRow(linha);
  }

  if (opcoes?.gastos) {
    const gastos = livro.addWorksheet("Gastos");
    gastos.addRow(["Descrição", "Categoria", "Valor", "Data"]);
    for (const linha of opcoes.gastos) gastos.addRow(linha);
  }

  if (opcoes?.equipe) {
    const equipe = livro.addWorksheet("Equipe");
    equipe.addRow([
      "Funcionário",
      "Remuneração",
      "Salário mensal",
      "Valor da diária",
      "Comissão (%)",
      "Dia inicial",
      "Dia final",
      "Incluir fim de semana",
    ]);
    for (const linha of opcoes.equipe) equipe.addRow(linha);
  }

  const dados = await livro.xlsx.writeBuffer();
  return dados as ArrayBuffer;
}

function mensagens(problemas: ProblemaPlanilha[]) {
  return problemas.map((p) => p.mensagem).join(" | ");
}

describe("lerPlanilha — planilha correta", () => {
  it("lê o serviço e o produto", async () => {
    const resultado = await lerPlanilha(await montar());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.dados.servico.cliente).toBe("Transportes Silva");
    expect(resultado.dados.servico.veiculo).toBe("Scania R450 2019");
    expect(resultado.dados.servico.valorOrcado.toString()).toBe("8000");
    expect(resultado.dados.servico.status).toBe("EM_ANDAMENTO");
    expect(resultado.dados.produtos).toHaveLength(1);
    expect(resultado.dados.produtos[0].custoTotal.toString()).toBe("600");
  });

  it("põe a placa em maiúsculas", async () => {
    const resultado = await lerPlanilha(await montar());
    if (!resultado.ok) throw new Error("deveria ler");
    expect(resultado.dados.servico.placa).toBe("ABC1D23");
  });

  it("entende a data como meia-noite em UTC", async () => {
    const resultado = await lerPlanilha(await montar());
    if (!resultado.ok) throw new Error("deveria ler");
    expect(resultado.dados.servico.dataInicio.toISOString()).toBe(
      "2026-01-05T00:00:00.000Z",
    );
  });

  it("usa a data de início quando a linha do produto não tem data", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", 10, 60, "", "", ""]] }),
    );
    if (!resultado.ok) throw new Error("deveria ler");
    expect(resultado.dados.produtos[0].data?.toISOString()).toBe(
      "2026-01-05T00:00:00.000Z",
    );
  });

  it("assume Em andamento quando a situação está em branco", async () => {
    const resultado = await lerPlanilha(
      await montar({
        campos: [
          ["Cliente", "Silva"],
          ["Veículo", "Scania"],
          ["Data de início", "05/01/2026"],
        ],
      }),
    );
    if (!resultado.ok) throw new Error("deveria ler");
    expect(resultado.dados.servico.status).toBe("EM_ANDAMENTO");
  });
});

describe("lerPlanilha — tolerância de formato", () => {
  it("aceita cabeçalho sem acento e em maiúsculas", async () => {
    const resultado = await lerPlanilha(
      await montar({
        cabecalhoProdutos: [
          "PRODUTO",
          "CODIGO",
          "UNIDADE",
          "QUANTIDADE",
          "PRECO UNITARIO",
          "TOTAL",
          "DATA",
          "OBSERVACAO",
        ],
      }),
    );
    expect(resultado.ok).toBe(true);
  });

  it("aceita aba com nome sem acento", async () => {
    const resultado = await lerPlanilha(
      await montar({ abaServico: "SERVICO", abaProdutos: "produtos" }),
    );
    expect(resultado.ok).toBe(true);
  });

  it("ignora colunas a mais", async () => {
    const resultado = await lerPlanilha(
      await montar({
        cabecalhoProdutos: [
          "Produto",
          "Código",
          "Unidade",
          "Quantidade",
          "Preço unitário",
          "Total",
          "Data",
          "Observação",
          "Fornecedor antigo",
        ],
        produtos: [["Tinta", "T1", "L", 10, 60, 600, "08/01/2026", "", "Casa da Tinta"]],
      }),
    );
    expect(resultado.ok).toBe(true);
  });

  it("pula linhas em branco no meio da tabela", async () => {
    const resultado = await lerPlanilha(
      await montar({
        produtos: [
          ["Tinta", "", "L", 10, 60, "", "", ""],
          ["", "", "", "", "", "", "", ""],
          ["Thinner", "", "L", 5, 20, "", "", ""],
        ],
      }),
    );
    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.produtos).toHaveLength(2);
  });

  it("aceita número escrito como texto no formato brasileiro", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", "1.234,5", "60,25", "", "", ""]] }),
    );
    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.produtos[0].quantidade.toString()).toBe("1234.5");
    expect(resultado.dados.produtos[0].precoUnitario.toString()).toBe("60.25");
  });

  it("aceita unidade em minúsculas", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "l", 10, 60, "", "", ""]] }),
    );
    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.produtos[0].unidade).toBe("L");
  });
});

describe("lerPlanilha — planilha torta", () => {
  it("acusa arquivo que não é planilha", async () => {
    const lixo = new TextEncoder().encode("isto aqui não é um xlsx").buffer;
    const resultado = await lerPlanilha(lixo as ArrayBuffer);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/\.xlsx/);
  });

  it("acusa arquivo vazio", async () => {
    const resultado = await lerPlanilha(new ArrayBuffer(0));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/vazio/i);
  });

  it("acusa a falta da aba Produtos", async () => {
    const resultado = await lerPlanilha(await montar({ semAbaProdutos: true }));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/não tem a aba "Produtos"/);
  });

  it("acusa a falta da aba Serviço", async () => {
    const resultado = await lerPlanilha(await montar({ abaServico: "Dados gerais" }));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/não tem a aba "Serviço"/);
  });

  it("acusa coluna obrigatória ausente, dizendo qual", async () => {
    const resultado = await lerPlanilha(
      await montar({
        cabecalhoProdutos: ["Produto", "Código", "Unidade", "Preço unitário", "Total"],
        produtos: [["Tinta", "", "L", 60, 600]],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/Quantidade/);
  });

  it("acusa unidade inválida listando as válidas", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "GALÃO", 10, 60, "", "", ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/GALÃO/);
    expect(mensagens(resultado.erros)).toMatch(/UN, L/);
  });

  it("acusa quantidade negativa", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", -5, 60, "", "", ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/maior que zero/);
  });

  it("acusa quantidade que não é número", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", "dez litros", 60, "", "", ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/não é um número/);
  });

  it("acusa data impossível", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", 10, 60, "", "31/02/2026", ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/dd\/mm\/aaaa/);
  });

  it("acusa total divergente apontando os dois valores", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", 10, 60, 900, "", ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/900\.00.*600\.00/);
  });

  it("acusa a falta do cliente", async () => {
    const resultado = await lerPlanilha(
      await montar({
        campos: [
          ["Veículo", "Scania"],
          ["Data de início", "05/01/2026"],
        ],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/Cliente é obrigatório/);
  });

  it("acusa a falta da data de início", async () => {
    const resultado = await lerPlanilha(
      await montar({
        campos: [
          ["Cliente", "Silva"],
          ["Veículo", "Scania"],
        ],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/Data de início é obrigatória/);
  });

  it("acusa conclusão anterior ao início", async () => {
    const resultado = await lerPlanilha(
      await montar({
        campos: [
          ["Cliente", "Silva"],
          ["Veículo", "Scania"],
          ["Data de início", "05/01/2026"],
          ["Data de conclusão", "01/01/2026"],
        ],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/anterior à data de início/);
  });

  it("acusa planilha sem nenhum produto preenchido", async () => {
    const resultado = await lerPlanilha(await montar({ produtos: [] }));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/Nenhum produto preenchido/);
  });

  it("junta os erros de várias linhas em vez de parar no primeiro", async () => {
    const resultado = await lerPlanilha(
      await montar({
        produtos: [
          ["Tinta", "", "GALÃO", 10, 60, "", "", ""],
          ["Thinner", "", "L", -1, 20, "", "", ""],
          ["Massa", "", "KG", 5, "abc", "", "", ""],
        ],
      }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.length).toBeGreaterThanOrEqual(3);
    expect(resultado.erros.map((e) => e.linha)).toEqual(
      expect.arrayContaining([2, 3, 4]),
    );
  });
});

describe("lerPlanilha — avisos que não bloqueiam", () => {
  it("avisa a diferença de centavos e usa quantidade × preço", async () => {
    const resultado = await lerPlanilha(
      await montar({ produtos: [["Tinta", "", "L", 3, 33.33, 100, "", ""]] }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.dados.produtos[0].custoTotal.toString()).toBe("99.99");
    expect(mensagens(resultado.avisos)).toMatch(/arredondamento/);
  });

  it("avisa produto repetido sem bloquear", async () => {
    const resultado = await lerPlanilha(
      await montar({
        produtos: [
          ["Tinta", "", "L", 10, 60, "", "", ""],
          ["tinta", "", "L", 5, 60, "", "", ""],
        ],
      }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(mensagens(resultado.avisos)).toMatch(/também aparece na linha 2/);
  });
});

describe("lerPlanilha — abas opcionais", () => {
  it("aceita planilha sem as abas Gastos e Equipe", async () => {
    const resultado = await lerPlanilha(await montar());
    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.gastos).toEqual([]);
    expect(resultado.dados.equipe).toEqual([]);
  });

  it("lê gastos e equipe quando presentes", async () => {
    const resultado = await lerPlanilha(
      await montar({
        gastos: [["Retífica do cabeçote", "Terceirizado", 150, "10/01/2026"]],
        equipe: [["Carlos Pereira", "SALARIO", 2200, "", "", "05/01/2026", "09/01/2026", "Não"]],
      }),
    );

    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.gastos).toHaveLength(1);
    expect(resultado.dados.gastos[0].categoria).toBe("TERCEIRIZADO");
    expect(resultado.dados.equipe).toHaveLength(1);
    expect(resultado.dados.equipe[0].remuneracao).toBe("SALARIO");
    expect(resultado.dados.equipe[0].salarioMensal?.toString()).toBe("2200");
  });

  it("exige o salário quando a remuneração é por salário", async () => {
    const resultado = await lerPlanilha(
      await montar({
        equipe: [["Carlos", "SALARIO", "", "", "", "05/01/2026", "09/01/2026", "Não"]],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/exige o salário mensal/);
  });

  it("acusa categoria de gasto inexistente", async () => {
    const resultado = await lerPlanilha(
      await montar({ gastos: [["Almoço", "Rango", 50, ""]] }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/Rango/);
  });

  it("acusa a mesma pessoa duas vezes", async () => {
    const resultado = await lerPlanilha(
      await montar({
        equipe: [
          ["Carlos", "DIARIA", "", 180, "", "05/01/2026", "", "Não"],
          ["carlos", "DIARIA", "", 180, "", "06/01/2026", "", "Não"],
        ],
      }),
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(mensagens(resultado.erros)).toMatch(/mais de uma vez/);
  });
});

describe("modelo gerado", () => {
  it("é lido pelo próprio leitor com a linha de exemplo preenchida", async () => {
    // Garante que modelo e leitor não divergem: o arquivo que entregamos
    // preenchido com o exemplo tem que passar na conferência.
    const buffer = await gerarModelo();
    const resultado = await lerPlanilha(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );

    if (!resultado.ok) throw new Error(mensagens(resultado.erros));
    expect(resultado.dados.servico.cliente).toBe("Transportes Silva");
    expect(resultado.dados.produtos).toHaveLength(1);
    expect(resultado.dados.produtos[0].produto).toBe("Tinta PU Branca");
    expect(resultado.dados.gastos).toHaveLength(1);
    expect(resultado.dados.equipe).toHaveLength(1);
  });
});
