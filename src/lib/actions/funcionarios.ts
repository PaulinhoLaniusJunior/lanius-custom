"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decimalPositivoOpcional,
  errosPorCampo,
  telefone,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/validacao";

import { falha, type EstadoFormulario } from "./tipos";

const esquemaFuncionario = z.object({
  nome: textoObrigatorio("Informe o nome do funcionário."),
  funcao: textoOpcional(80),
  telefone,
  tipoPadrao: z.enum(["SALARIO", "DIARIA", "COMISSAO"]),
  salarioMensal: decimalPositivoOpcional("Informe um salário válido."),
  valorDiariaPadrao: decimalPositivoOpcional("Informe uma diária válida."),
  percentualComissaoPadrao: decimalPositivoOpcional(
    "Informe um percentual válido.",
  ),
});

function revalidarFuncionarios() {
  revalidatePath("/funcionarios");
  revalidatePath("/servicos");
}

/**
 * Confere se o valor exigido pela forma de remuneração escolhida foi
 * informado — um mensalista sem salário não teria como gerar custo.
 */
function validarValorDaRemuneracao(
  dados: z.infer<typeof esquemaFuncionario>,
): Record<string, string> | null {
  if (dados.tipoPadrao === "SALARIO" && !dados.salarioMensal) {
    return { salarioMensal: "Informe o salário mensal." };
  }
  if (dados.tipoPadrao === "DIARIA" && !dados.valorDiariaPadrao) {
    return { valorDiariaPadrao: "Informe o valor da diária." };
  }
  if (dados.tipoPadrao === "COMISSAO" && !dados.percentualComissaoPadrao) {
    return { percentualComissaoPadrao: "Informe o percentual de comissão." };
  }
  return null;
}

export async function criarFuncionario(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaFuncionario.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const faltando = validarValorDaRemuneracao(analise.data);
  if (faltando) {
    return { erro: "Confira os campos destacados.", campos: faltando };
  }

  try {
    await prisma.funcionario.create({ data: analise.data });
  } catch (erro) {
    return falha(erro, "Não foi possível cadastrar o funcionário.");
  }

  revalidarFuncionarios();
  return { sucesso: "Funcionário cadastrado." };
}

export async function editarFuncionario(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Funcionário não identificado." };

  const analise = esquemaFuncionario.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const faltando = validarValorDaRemuneracao(analise.data);
  if (faltando) {
    return { erro: "Confira os campos destacados.", campos: faltando };
  }

  try {
    await prisma.funcionario.update({ where: { id }, data: analise.data });
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o funcionário.");
  }

  // Serviços já lançados guardam a própria cópia dos valores, então esta
  // alteração não mexe no custo do que já foi fechado.
  revalidarFuncionarios();
  return { sucesso: "Funcionário salvo." };
}

export async function alternarFuncionarioAtivo(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const funcionario = await prisma.funcionario.findUnique({
    where: { id },
    select: { ativo: true },
  });
  if (!funcionario) return;

  await prisma.funcionario.update({
    where: { id },
    data: { ativo: !funcionario.ativo },
  });

  revalidarFuncionarios();
}
