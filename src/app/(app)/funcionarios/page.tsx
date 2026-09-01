import type { Metadata } from "next";

import {
  FormularioFuncionario,
  type FuncionarioForm,
} from "@/app/(app)/funcionarios/formulario-funcionario";
import { estiloBotao } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Vazio,
} from "@/components/ui/layout";
import { alternarFuncionarioAtivo } from "@/lib/actions/funcionarios";
import type { Decimal } from "@/lib/decimal";
import { formatarMoeda, formatarTelefone } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_REMUNERACAO } from "@/lib/rotulos";
import type { TipoRemuneracao } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Funcionários" };

/** Texto do valor que vale para a forma de remuneração escolhida. */
function valorDaRemuneracao(funcionario: {
  tipoPadrao: TipoRemuneracao;
  salarioMensal: Decimal | null;
  valorDiariaPadrao: Decimal | null;
  percentualComissaoPadrao: Decimal | null;
}) {
  if (funcionario.tipoPadrao === "SALARIO") {
    return funcionario.salarioMensal
      ? `${formatarMoeda(funcionario.salarioMensal)} por mês`
      : "Salário não informado";
  }
  if (funcionario.tipoPadrao === "DIARIA") {
    return funcionario.valorDiariaPadrao
      ? `${formatarMoeda(funcionario.valorDiariaPadrao)} por dia`
      : "Diária não informada";
  }
  return funcionario.percentualComissaoPadrao
    ? `${funcionario.percentualComissaoPadrao.toString()}% do serviço`
    : "Comissão não informada";
}

export default async function Funcionarios() {
  const funcionarios = await prisma.funcionario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const paraFormulario = (funcionario: (typeof funcionarios)[number]): FuncionarioForm => ({
    id: funcionario.id,
    nome: funcionario.nome,
    funcao: funcionario.funcao,
    telefone: funcionario.telefone,
    tipoPadrao: funcionario.tipoPadrao,
    salarioMensal: funcionario.salarioMensal?.toFixed(2).replace(".", ",") ?? "",
    valorDiariaPadrao:
      funcionario.valorDiariaPadrao?.toFixed(2).replace(".", ",") ?? "",
    percentualComissaoPadrao:
      funcionario.percentualComissaoPadrao?.toString() ?? "",
  });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Funcionários"
        descricao="Quem trabalha nos serviços e quanto custa o dia de cada um."
      />

      <Cartao>
        <CartaoCabecalho
          titulo="Novo funcionário"
          descricao="O valor cadastrado aqui é só a sugestão: cada serviço guarda a própria cópia."
        />
        <CartaoCorpo>
          <FormularioFuncionario />
        </CartaoCorpo>
      </Cartao>

      {funcionarios.length === 0 ? (
        <Cartao>
          <Vazio
            titulo="Nenhum funcionário cadastrado"
            descricao="Cadastre a equipe acima para poder lançar os dias trabalhados nos serviços."
          />
        </Cartao>
      ) : (
        <div className="flex flex-col gap-3">
          {funcionarios.map((funcionario) => (
            <details key={funcionario.id} className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-xl border border-borda bg-superficie/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-texto">
                    {funcionario.nome}
                    {!funcionario.ativo && <Etiqueta>Inativo</Etiqueta>}
                  </p>
                  <p className="mt-0.5 text-sm text-texto-fraco">
                    {[
                      funcionario.funcao,
                      formatarTelefone(funcionario.telefone) !== "-"
                        ? formatarTelefone(funcionario.telefone)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem função informada"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Etiqueta tom="marca">
                      {ROTULO_REMUNERACAO[funcionario.tipoPadrao]}
                    </Etiqueta>
                    <p className="mt-1 text-sm tabular text-texto-suave">
                      {valorDaRemuneracao(funcionario)}
                    </p>
                  </div>
                  <span className="text-xs text-texto-fraco group-open:hidden">
                    Editar
                  </span>
                </div>
              </summary>

              <Cartao className="mt-2">
                <CartaoCorpo className="flex flex-col gap-4">
                  <FormularioFuncionario
                    funcionario={paraFormulario(funcionario)}
                  />
                  <form
                    action={alternarFuncionarioAtivo}
                    className="flex justify-end border-t border-borda pt-3"
                  >
                    <input type="hidden" name="id" value={funcionario.id} />
                    <button
                      type="submit"
                      className={estiloBotao("perigo", "pequeno")}
                    >
                      {funcionario.ativo
                        ? "Desativar funcionário"
                        : "Reativar funcionário"}
                    </button>
                  </form>
                </CartaoCorpo>
              </Cartao>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
