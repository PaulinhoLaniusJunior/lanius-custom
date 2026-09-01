import { describe, expect, it } from "vitest";

import { Decimal } from "@/lib/decimal";

import {
  agruparPorFornecedor,
  economiaTotal,
  melhoresPrecos,
  quantidadeParaRepor,
  type ItemCotacao,
  type PrecoDeFornecedor,
} from "./cotacao";

function item(
  produtoId: string,
  produtoNome: string,
  quantidade: number,
  unidade = "L",
): ItemCotacao {
  return {
    produtoId,
    produtoNome,
    unidade,
    quantidade: new Decimal(quantidade),
  };
}

function preco(
  produtoId: string,
  fornecedorId: string,
  fornecedorNome: string,
  valor: number,
  atualizadoEm = new Date("2026-01-01T00:00:00Z"),
): PrecoDeFornecedor {
  return {
    produtoId,
    fornecedorId,
    fornecedorNome,
    fornecedorTelefone: null,
    fornecedorCidade: null,
    preco: new Decimal(valor),
    atualizadoEm,
  };
}

describe("melhoresPrecos", () => {
  it("escolhe o fornecedor mais barato de cada produto", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10)],
      [
        preco("tinta", "f1", "Tintas Norte", 90),
        preco("tinta", "f2", "Casa da Tinta", 78),
        preco("tinta", "f3", "Distribuidora Sul", 85),
      ],
    );

    expect(resultado.encontrados).toHaveLength(1);
    expect(resultado.encontrados[0].fornecedorNome).toBe("Casa da Tinta");
    expect(resultado.encontrados[0].preco.toString()).toBe("78");
    expect(resultado.encontrados[0].subtotal.toString()).toBe("780");
    expect(resultado.total.toString()).toBe("780");
  });

  it("mistura fornecedores diferentes na mesma cotacao", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10), item("lixa", "Lixa 320", 50, "UN")],
      [
        preco("tinta", "f1", "Tintas Norte", 90),
        preco("tinta", "f2", "Casa da Tinta", 78),
        preco("lixa", "f1", "Tintas Norte", 2),
        preco("lixa", "f2", "Casa da Tinta", 3),
      ],
    );

    expect(resultado.encontrados.map((linha) => linha.fornecedorNome)).toEqual([
      "Casa da Tinta",
      "Tintas Norte",
    ]);
    // 10 x 78 + 50 x 2.
    expect(resultado.total.toString()).toBe("880");
  });

  it("no empate, fica com o preco atualizado mais recentemente", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 1)],
      [
        preco("tinta", "f1", "Antigo", 80, new Date("2026-01-01T00:00:00Z")),
        preco("tinta", "f2", "Recente", 80, new Date("2026-06-01T00:00:00Z")),
      ],
    );

    expect(resultado.encontrados[0].fornecedorNome).toBe("Recente");
  });

  it("separa os itens que nenhum fornecedor tem cadastrado", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10), item("verniz", "Verniz PU", 5)],
      [preco("tinta", "f1", "Tintas Norte", 90)],
    );

    expect(resultado.encontrados).toHaveLength(1);
    expect(resultado.semPreco).toHaveLength(1);
    expect(resultado.semPreco[0].produtoNome).toBe("Verniz PU");
    // O item sem preco nao pode entrar no total.
    expect(resultado.total.toString()).toBe("900");
  });

  it("calcula a economia contra o fornecedor mais caro", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10)],
      [
        preco("tinta", "f1", "Tintas Norte", 90),
        preco("tinta", "f2", "Casa da Tinta", 78),
      ],
    );

    expect(resultado.encontrados[0].concorrentes).toBe(2);
    // 10 x (90 - 78).
    expect(resultado.encontrados[0].economia?.toString()).toBe("120");
  });

  it("nao aponta economia quando so ha um fornecedor", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10)],
      [preco("tinta", "f1", "Tintas Norte", 90)],
    );

    expect(resultado.encontrados[0].economia).toBeNull();
  });

  it("devolve tudo vazio quando a cotacao nao tem itens", () => {
    const resultado = melhoresPrecos([], [preco("tinta", "f1", "Norte", 90)]);

    expect(resultado.encontrados).toHaveLength(0);
    expect(resultado.semPreco).toHaveLength(0);
    expect(resultado.total.toString()).toBe("0");
  });

  it("respeita quantidades fracionadas", () => {
    const resultado = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 2.5)],
      [preco("tinta", "f1", "Tintas Norte", "33.33" as unknown as number)],
    );

    // 2.5 x 33.33 = 83.325 -> 83.33.
    expect(resultado.encontrados[0].subtotal.toString()).toBe("83.33");
  });
});

describe("agruparPorFornecedor", () => {
  it("agrupa por fornecedor, em ordem alfabetica, com subtotal", () => {
    const { encontrados } = melhoresPrecos(
      [
        item("tinta", "Tinta PU branca", 10),
        item("lixa", "Lixa 320", 50, "UN"),
        item("massa", "Massa plastica", 4, "KG"),
      ],
      [
        preco("tinta", "f2", "Casa da Tinta", 78),
        preco("lixa", "f1", "Tintas Norte", 2),
        preco("massa", "f2", "Casa da Tinta", 25),
      ],
    );

    const grupos = agruparPorFornecedor(encontrados);

    expect(grupos.map((grupo) => grupo.fornecedorNome)).toEqual([
      "Casa da Tinta",
      "Tintas Norte",
    ]);
    // 10 x 78 + 4 x 25.
    expect(grupos[0].subtotal.toString()).toBe("880");
    expect(grupos[1].subtotal.toString()).toBe("100");
  });

  it("ordena os produtos dentro de cada fornecedor pelo nome", () => {
    const { encontrados } = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 1), item("lixa", "Lixa 320", 1, "UN")],
      [
        preco("tinta", "f1", "Tintas Norte", 78),
        preco("lixa", "f1", "Tintas Norte", 2),
      ],
    );

    const grupos = agruparPorFornecedor(encontrados);

    expect(grupos[0].linhas.map((linha) => linha.item.produtoNome)).toEqual([
      "Lixa 320",
      "Tinta PU branca",
    ]);
  });
});

describe("economiaTotal", () => {
  it("soma a economia de todas as linhas", () => {
    const { encontrados } = melhoresPrecos(
      [item("tinta", "Tinta PU branca", 10), item("lixa", "Lixa 320", 50, "UN")],
      [
        preco("tinta", "f1", "Tintas Norte", 90),
        preco("tinta", "f2", "Casa da Tinta", 78),
        preco("lixa", "f1", "Tintas Norte", 2),
        preco("lixa", "f2", "Casa da Tinta", 3),
      ],
    );

    // 10 x 12 + 50 x 1.
    expect(economiaTotal(encontrados).toString()).toBe("170");
  });
});

describe("quantidadeParaRepor", () => {
  it("sugere a diferenca ate o estoque minimo", () => {
    expect(
      quantidadeParaRepor({ saldoAtual: 3, estoqueMinimo: 10 }).toString(),
    ).toBe("7");
  });

  it("nao sugere compra quando o estoque esta em dia", () => {
    expect(
      quantidadeParaRepor({ saldoAtual: 12, estoqueMinimo: 10 }).toString(),
    ).toBe("0");
  });
});
