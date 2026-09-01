import { describe, expect, it } from "vitest";

import {
  SaldoInsuficienteError,
  abaixoDoMinimo,
  aplicarAjuste,
  aplicarEntrada,
  aplicarEstorno,
  aplicarSaida,
  valorEmEstoque,
} from "./estoque";

describe("aplicarEntrada", () => {
  it("define o custo do produto na primeira compra", () => {
    const posicao = aplicarEntrada({
      saldoAtual: 0,
      custoMedio: 0,
      quantidade: 10,
      precoUnitario: 50,
    });

    expect(posicao.saldoAtual.toString()).toBe("10");
    expect(posicao.custoMedio.toString()).toBe("50");
  });

  it("faz a media ponderada quando o preco muda entre compras", () => {
    // 10 L a R$ 50 e depois 10 L a R$ 60 -> 20 L a R$ 55.
    const primeira = aplicarEntrada({
      saldoAtual: 0,
      custoMedio: 0,
      quantidade: 10,
      precoUnitario: 50,
    });
    const segunda = aplicarEntrada({
      saldoAtual: primeira.saldoAtual,
      custoMedio: primeira.custoMedio,
      quantidade: 10,
      precoUnitario: 60,
    });

    expect(segunda.saldoAtual.toString()).toBe("20");
    expect(segunda.custoMedio.toString()).toBe("55");
  });

  it("pondera pela quantidade, nao pela quantidade de compras", () => {
    // 90 L a R$ 10 e 10 L a R$ 110 -> media R$ 20, e nao R$ 60.
    const primeira = aplicarEntrada({
      saldoAtual: 0,
      custoMedio: 0,
      quantidade: 90,
      precoUnitario: 10,
    });
    const segunda = aplicarEntrada({
      saldoAtual: primeira.saldoAtual,
      custoMedio: primeira.custoMedio,
      quantidade: 10,
      precoUnitario: 110,
    });

    expect(segunda.custoMedio.toString()).toBe("20");
  });

  it("recusa quantidade zerada ou negativa", () => {
    expect(() =>
      aplicarEntrada({
        saldoAtual: 0,
        custoMedio: 0,
        quantidade: 0,
        precoUnitario: 10,
      }),
    ).toThrow(/maior que zero/);
  });

  it("recusa preco negativo", () => {
    expect(() =>
      aplicarEntrada({
        saldoAtual: 0,
        custoMedio: 0,
        quantidade: 1,
        precoUnitario: -1,
      }),
    ).toThrow(/negativo/);
  });
});

describe("aplicarSaida", () => {
  it("baixa do saldo e congela o custo medio do momento", () => {
    const saida = aplicarSaida({ saldoAtual: 20, custoMedio: 55, quantidade: 8 });

    expect(saida.saldoAtual.toString()).toBe("12");
    expect(saida.custoUnitario.toString()).toBe("55");
    expect(saida.custoTotal.toString()).toBe("440");
  });

  it("nao altera o custo medio do produto", () => {
    const saida = aplicarSaida({ saldoAtual: 20, custoMedio: 55, quantidade: 8 });
    expect(saida.custoMedio.toString()).toBe("55");
  });

  it("bloqueia a baixa quando falta saldo", () => {
    expect(() =>
      aplicarSaida({ saldoAtual: 12, custoMedio: 55, quantidade: 100 }),
    ).toThrow(SaldoInsuficienteError);
  });

  it("permite zerar o estoque exatamente", () => {
    const saida = aplicarSaida({ saldoAtual: 12, custoMedio: 55, quantidade: 12 });
    expect(saida.saldoAtual.toString()).toBe("0");
  });

  it("arredonda o custo total para centavos", () => {
    const saida = aplicarSaida({
      saldoAtual: 10,
      custoMedio: "33.3333",
      quantidade: 3,
    });
    expect(saida.custoTotal.toString()).toBe("100");
  });
});

describe("aplicarEstorno", () => {
  it("devolve o produto pelo custo com que ele saiu", () => {
    // Saiu 8 L a R$ 55 e depois o custo medio subiu para R$ 70.
    const posicao = aplicarEstorno({
      saldoAtual: 12,
      custoMedio: 70,
      quantidade: 8,
      custoUnitario: 55,
    });

    expect(posicao.saldoAtual.toString()).toBe("20");
    // (12 x 70 + 8 x 55) / 20 = 64.
    expect(posicao.custoMedio.toString()).toBe("64");
  });

  it("restaura saldo e custo quando nada mudou entre a baixa e o estorno", () => {
    const saida = aplicarSaida({ saldoAtual: 20, custoMedio: 55, quantidade: 8 });
    const estorno = aplicarEstorno({
      saldoAtual: saida.saldoAtual,
      custoMedio: saida.custoMedio,
      quantidade: 8,
      custoUnitario: saida.custoUnitario,
    });

    expect(estorno.saldoAtual.toString()).toBe("20");
    expect(estorno.custoMedio.toString()).toBe("55");
  });
});

describe("aplicarAjuste", () => {
  it("registra a sobra encontrada no inventario", () => {
    const ajuste = aplicarAjuste({
      saldoAtual: 10,
      custoMedio: 55,
      saldoContado: 12,
    });

    expect(ajuste.saldoAtual.toString()).toBe("12");
    expect(ajuste.diferenca.toString()).toBe("2");
    expect(ajuste.custoTotal.toString()).toBe("110");
  });

  it("registra a falta encontrada no inventario", () => {
    const ajuste = aplicarAjuste({
      saldoAtual: 10,
      custoMedio: 55,
      saldoContado: 7,
    });

    expect(ajuste.diferenca.toString()).toBe("-3");
    expect(ajuste.custoTotal.toString()).toBe("165");
  });

  it("recusa saldo contado negativo", () => {
    expect(() =>
      aplicarAjuste({ saldoAtual: 10, custoMedio: 55, saldoContado: -1 }),
    ).toThrow(/negativo/);
  });
});

describe("valorEmEstoque", () => {
  it("multiplica saldo por custo medio", () => {
    expect(
      valorEmEstoque({ saldoAtual: 12, custoMedio: 55 }).toString(),
    ).toBe("660");
  });
});

describe("abaixoDoMinimo", () => {
  it("acusa quando o saldo fica abaixo do minimo", () => {
    expect(abaixoDoMinimo({ saldoAtual: 3, estoqueMinimo: 5 })).toBe(true);
  });

  it("nao acusa quando o saldo esta exatamente no minimo", () => {
    expect(abaixoDoMinimo({ saldoAtual: 5, estoqueMinimo: 5 })).toBe(false);
  });

  it("ignora produtos sem minimo definido", () => {
    expect(abaixoDoMinimo({ saldoAtual: 0, estoqueMinimo: 0 })).toBe(false);
  });
});
