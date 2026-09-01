import { describe, expect, it } from "vitest";

import { diasCorridos, resumoDoServico } from "./servico";

function dia(ano: number, mes: number, diaDoMes: number): Date {
  return new Date(Date.UTC(ano, mes - 1, diaDoMes));
}

describe("resumoDoServico", () => {
  it("soma produtos, gastos e mao de obra e apura a margem", () => {
    const resumo = resumoDoServico({
      valorOrcado: 8000,
      custosProdutos: [440, 260],
      gastos: [150],
      equipe: [
        {
          alocacao: { tipoRemuneracao: "SALARIO", salarioMensal: 2200 },
          dias: [1, 2, 5, 6, 7].map((d) => dia(2026, 1, d)),
        },
      ],
    });

    expect(resumo.custoProdutos.toString()).toBe("700");
    expect(resumo.custoGastos.toString()).toBe("150");
    expect(resumo.custoMaoDeObra.toString()).toBe("500");
    expect(resumo.custoTotal.toString()).toBe("1350");
    expect(resumo.margem.toString()).toBe("6650");
    expect(resumo.totalDiasTrabalhados).toBe(5);
  });

  it("calcula a margem percentual sobre o valor orcado", () => {
    const resumo = resumoDoServico({
      valorOrcado: 1000,
      custosProdutos: [250],
      gastos: [],
      equipe: [],
    });

    expect(resumo.margemPercentual?.toString()).toBe("75");
  });

  it("acusa prejuizo com margem negativa", () => {
    const resumo = resumoDoServico({
      valorOrcado: 1000,
      custosProdutos: [800],
      gastos: [400],
      equipe: [],
    });

    expect(resumo.margem.toString()).toBe("-200");
    expect(resumo.margemPercentual?.toString()).toBe("-20");
  });

  it("nao calcula percentual quando nao ha valor orcado", () => {
    const resumo = resumoDoServico({
      valorOrcado: 0,
      custosProdutos: [100],
      gastos: [],
      equipe: [],
    });

    expect(resumo.margemPercentual).toBeNull();
    expect(resumo.margem.toString()).toBe("-100");
  });

  it("soma o custo de varias pessoas na equipe", () => {
    const resumo = resumoDoServico({
      valorOrcado: 8000,
      custosProdutos: [],
      gastos: [],
      equipe: [
        {
          alocacao: { tipoRemuneracao: "SALARIO", salarioMensal: 2200 },
          dias: [dia(2026, 1, 5)],
        },
        {
          alocacao: { tipoRemuneracao: "DIARIA", valorDiaria: 180 },
          dias: [dia(2026, 1, 5), dia(2026, 1, 6)],
        },
        {
          alocacao: { tipoRemuneracao: "COMISSAO", percentualComissao: 5 },
          dias: [],
        },
      ],
    });

    // 100 + 360 + 400.
    expect(resumo.custoMaoDeObra.toString()).toBe("860");
    expect(resumo.totalDiasTrabalhados).toBe(3);
  });

  it("zera tudo em um servico recem-criado", () => {
    const resumo = resumoDoServico({
      valorOrcado: 5000,
      custosProdutos: [],
      gastos: [],
      equipe: [],
    });

    expect(resumo.custoTotal.toString()).toBe("0");
    expect(resumo.margem.toString()).toBe("5000");
    expect(resumo.margemPercentual?.toString()).toBe("100");
  });
});

describe("diasCorridos", () => {
  it("conta o dia de inicio como o primeiro dia", () => {
    expect(diasCorridos(dia(2026, 1, 5), dia(2026, 1, 5))).toBe(1);
  });

  it("conta o intervalo fechado entre inicio e conclusao", () => {
    expect(diasCorridos(dia(2026, 1, 5), dia(2026, 1, 14))).toBe(10);
  });

  it("usa a data de hoje enquanto o servico esta aberto", () => {
    expect(diasCorridos(dia(2026, 1, 5), null, dia(2026, 1, 9))).toBe(5);
  });
});
