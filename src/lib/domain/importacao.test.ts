import { describe, expect, it } from "vitest";

import { aplicarEntrada, aplicarSaida } from "./estoque";
import { conferirTotal, consumoHistorico } from "./importacao";

describe("consumoHistorico", () => {
  it("cobra do serviço exatamente o preço da planilha", () => {
    const resultado = consumoHistorico({
      saldoAtual: 20,
      custoMedio: 55,
      quantidade: 10,
      precoUnitario: 60,
    });

    expect(resultado.saida.custoUnitario.toString()).toBe("60");
    expect(resultado.saida.custoTotal.toString()).toBe("600");
  });

  it("não mexe no saldo nem no custo médio de um produto com estoque", () => {
    const resultado = consumoHistorico({
      saldoAtual: 20,
      custoMedio: 55,
      quantidade: 10,
      precoUnitario: 60,
    });

    expect(resultado.saldoAtual.toString()).toBe("20");
    expect(resultado.custoMedio.toString()).toBe("55");
    expect(resultado.definiuCustoMedio).toBe(false);
  });

  it("gera entrada e saída da mesma quantidade e do mesmo preço", () => {
    const resultado = consumoHistorico({
      saldoAtual: 20,
      custoMedio: 55,
      quantidade: 8,
      precoUnitario: 50,
    });

    expect(resultado.entrada.quantidade.toString()).toBe(
      resultado.saida.quantidade.toString(),
    );
    expect(resultado.entrada.custoUnitario.toString()).toBe(
      resultado.saida.custoUnitario.toString(),
    );
  });

  it("é justamente o que encadear entrada e saída não faria", () => {
    // O caminho ingênuo distorce o custo médio e cobra o valor errado.
    const posicao = aplicarEntrada({
      saldoAtual: 20,
      custoMedio: 55,
      quantidade: 10,
      precoUnitario: 60,
    });
    const saida = aplicarSaida({
      saldoAtual: posicao.saldoAtual,
      custoMedio: posicao.custoMedio,
      quantidade: 10,
    });

    expect(posicao.custoMedio.toString()).toBe("56.6667");
    expect(saida.custoTotal.toString()).toBe("566.67");

    // A regra do lançamento retroativo preserva os dois.
    const historico = consumoHistorico({
      saldoAtual: 20,
      custoMedio: 55,
      quantidade: 10,
      precoUnitario: 60,
    });

    expect(historico.custoMedio.toString()).toBe("55");
    expect(historico.saida.custoTotal.toString()).toBe("600");
  });

  it("define o custo médio quando o produto não tem histórico nenhum", () => {
    const resultado = consumoHistorico({
      saldoAtual: 0,
      custoMedio: 0,
      quantidade: 5,
      precoUnitario: 78,
    });

    expect(resultado.saldoAtual.toString()).toBe("0");
    expect(resultado.custoMedio.toString()).toBe("78");
    expect(resultado.definiuCustoMedio).toBe(true);
  });

  it("preserva o custo médio de produto com saldo zerado mas com histórico", () => {
    // Saldo zerou depois de consumir tudo, mas o custo conhecido continua valendo.
    const resultado = consumoHistorico({
      saldoAtual: 0,
      custoMedio: 55,
      quantidade: 5,
      precoUnitario: 78,
    });

    expect(resultado.custoMedio.toString()).toBe("55");
    expect(resultado.definiuCustoMedio).toBe(false);
  });

  it("arredonda o custo total para centavos", () => {
    const resultado = consumoHistorico({
      saldoAtual: 10,
      custoMedio: 20,
      quantidade: 3,
      precoUnitario: "33.333",
    });

    expect(resultado.saida.custoTotal.toString()).toBe("100");
  });

  it("recusa quantidade zerada ou negativa", () => {
    expect(() =>
      consumoHistorico({
        saldoAtual: 10,
        custoMedio: 20,
        quantidade: 0,
        precoUnitario: 10,
      }),
    ).toThrow(/maior que zero/);
  });

  it("recusa preço negativo", () => {
    expect(() =>
      consumoHistorico({
        saldoAtual: 10,
        custoMedio: 20,
        quantidade: 1,
        precoUnitario: -1,
      }),
    ).toThrow(/negativo/);
  });
});

describe("conferirTotal", () => {
  it("aceita o total que bate exatamente", () => {
    const resultado = conferirTotal({
      quantidade: 10,
      precoUnitario: 60,
      totalInformado: 600,
    });

    expect(resultado.total.toString()).toBe("600");
    expect(resultado.diferenca?.toString()).toBe("0");
    expect(resultado.divergente).toBe(false);
  });

  it("tolera diferença de centavos vinda de arredondamento", () => {
    // 3 x 33,33 = 99,99, mas a planilha arredondou para 100,00.
    const resultado = conferirTotal({
      quantidade: 3,
      precoUnitario: "33.33",
      totalInformado: 100,
    });

    expect(resultado.diferenca?.toString()).toBe("0.01");
    expect(resultado.divergente).toBe(false);
  });

  it("aceita a diferença exatamente no limite da tolerância", () => {
    const resultado = conferirTotal({
      quantidade: 1,
      precoUnitario: 100,
      totalInformado: "100.05",
    });

    expect(resultado.divergente).toBe(false);
  });

  it("acusa divergência acima da tolerância", () => {
    const resultado = conferirTotal({
      quantidade: 10,
      precoUnitario: 60,
      totalInformado: 601,
    });

    expect(resultado.diferenca?.toString()).toBe("1");
    expect(resultado.divergente).toBe(true);
  });

  it("acusa divergência também quando o total informado é menor", () => {
    const resultado = conferirTotal({
      quantidade: 10,
      precoUnitario: 60,
      totalInformado: 500,
    });

    expect(resultado.divergente).toBe(true);
  });

  it("aceita a linha sem total informado", () => {
    const resultado = conferirTotal({
      quantidade: 10,
      precoUnitario: 60,
      totalInformado: null,
    });

    expect(resultado.total.toString()).toBe("600");
    expect(resultado.diferenca).toBeNull();
    expect(resultado.divergente).toBe(false);
  });

  it("sempre grava quantidade x preço, mesmo com total informado diferente", () => {
    const resultado = conferirTotal({
      quantidade: 3,
      precoUnitario: "33.33",
      totalInformado: 100,
    });

    expect(resultado.total.toString()).toBe("99.99");
  });
});
