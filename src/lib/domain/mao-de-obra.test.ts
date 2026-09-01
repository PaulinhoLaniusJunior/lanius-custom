import { describe, expect, it } from "vitest";

import {
  custoDaAlocacao,
  diasUteisDoMes,
  explicarCalculo,
  valorDoDiaPorSalario,
} from "./mao-de-obra";

/** Data sem hora, em UTC — como os dias trabalhados sao gravados no banco. */
function dia(ano: number, mes: number, diaDoMes: number): Date {
  return new Date(Date.UTC(ano, mes - 1, diaDoMes));
}

describe("diasUteisDoMes", () => {
  it("conta 22 dias uteis em janeiro de 2026", () => {
    expect(diasUteisDoMes(dia(2026, 1, 15))).toBe(22);
  });

  it("conta 20 dias uteis em fevereiro de 2026", () => {
    expect(diasUteisDoMes(dia(2026, 2, 10))).toBe(20);
  });

  it("conta 21 dias uteis em maio de 2026", () => {
    expect(diasUteisDoMes(dia(2026, 5, 3))).toBe(21);
  });

  it("considera o dia extra de fevereiro em ano bissexto", () => {
    expect(diasUteisDoMes(dia(2024, 2, 1))).toBe(21);
    expect(diasUteisDoMes(dia(2025, 2, 1))).toBe(20);
  });

  it("da o mesmo resultado para qualquer dia do mesmo mes", () => {
    expect(diasUteisDoMes(dia(2026, 1, 1))).toBe(diasUteisDoMes(dia(2026, 1, 31)));
  });
});

describe("valorDoDiaPorSalario", () => {
  it("divide o salario pelos dias uteis do mes do dia trabalhado", () => {
    expect(valorDoDiaPorSalario(2200, dia(2026, 1, 5)).toString()).toBe("100");
  });

  it("encarece o dia em um mes com menos dias uteis", () => {
    // O mesmo salario de R$ 2.200 em fevereiro (20 uteis) da R$ 110 por dia.
    expect(valorDoDiaPorSalario(2200, dia(2026, 2, 5)).toString()).toBe("110");
  });
});

describe("custoDaAlocacao — SALARIO", () => {
  const alocacao = { tipoRemuneracao: "SALARIO" as const, salarioMensal: 2200 };

  it("cobra 5 dias de janeiro pelo valor do dia de janeiro", () => {
    const resultado = custoDaAlocacao({
      alocacao,
      dias: [1, 2, 5, 6, 7].map((d) => dia(2026, 1, d)),
      valorOrcado: 8000,
    });

    expect(resultado.totalDias).toBe(5);
    expect(resultado.custo.toString()).toBe("500");
    expect(resultado.valorMedioDia?.toString()).toBe("100");
  });

  it("usa os dias uteis de cada mes quando o servico atravessa a virada", () => {
    // 2 dias em janeiro (R$ 100) + 2 dias em fevereiro (R$ 110) = R$ 420.
    const resultado = custoDaAlocacao({
      alocacao,
      dias: [dia(2026, 1, 29), dia(2026, 1, 30), dia(2026, 2, 2), dia(2026, 2, 3)],
      valorOrcado: 8000,
    });

    expect(resultado.custo.toString()).toBe("420");
  });

  it("nao cobra nada quando nenhum dia foi lancado", () => {
    const resultado = custoDaAlocacao({ alocacao, dias: [], valorOrcado: 8000 });

    expect(resultado.custo.toString()).toBe("0");
    expect(resultado.valorMedioDia).toBeNull();
  });

  it("ignora o valor orcado do servico", () => {
    const dias = [dia(2026, 1, 5)];
    const barato = custoDaAlocacao({ alocacao, dias, valorOrcado: 100 });
    const caro = custoDaAlocacao({ alocacao, dias, valorOrcado: 100000 });

    expect(barato.custo.toString()).toBe(caro.custo.toString());
  });
});

describe("custoDaAlocacao — DIARIA", () => {
  it("multiplica os dias pela diaria combinada", () => {
    const resultado = custoDaAlocacao({
      alocacao: { tipoRemuneracao: "DIARIA", valorDiaria: 180 },
      dias: [dia(2026, 1, 5), dia(2026, 1, 6), dia(2026, 2, 9)],
      valorOrcado: 8000,
    });

    expect(resultado.custo.toString()).toBe("540");
    expect(resultado.valorMedioDia?.toString()).toBe("180");
  });
});

describe("custoDaAlocacao — COMISSAO", () => {
  it("aplica o percentual sobre o valor orcado", () => {
    const resultado = custoDaAlocacao({
      alocacao: { tipoRemuneracao: "COMISSAO", percentualComissao: 10 },
      dias: [],
      valorOrcado: 8000,
    });

    expect(resultado.custo.toString()).toBe("800");
    expect(resultado.valorMedioDia).toBeNull();
  });

  it("nao depende dos dias lancados", () => {
    const alocacao = {
      tipoRemuneracao: "COMISSAO" as const,
      percentualComissao: "7.5",
    };
    const semDias = custoDaAlocacao({ alocacao, dias: [], valorOrcado: 8000 });
    const comDias = custoDaAlocacao({
      alocacao,
      dias: [dia(2026, 1, 5), dia(2026, 1, 6)],
      valorOrcado: 8000,
    });

    expect(semDias.custo.toString()).toBe("600");
    expect(comDias.custo.toString()).toBe("600");
  });
});

describe("explicarCalculo", () => {
  it("mostra a conta do mensalista", () => {
    expect(
      explicarCalculo({
        alocacao: { tipoRemuneracao: "SALARIO", salarioMensal: 2200 },
        dias: [dia(2026, 1, 5)],
      }),
    ).toBe("1 dia(s) × (salário / 22 dias úteis)");
  });

  it("lista os dois meses quando o servico atravessa a virada", () => {
    expect(
      explicarCalculo({
        alocacao: { tipoRemuneracao: "SALARIO", salarioMensal: 2200 },
        dias: [dia(2026, 1, 29), dia(2026, 2, 2)],
      }),
    ).toBe("2 dia(s) × (salário / 20 e 22 dias úteis)");
  });
});
