"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirSessao } from "@/lib/auth";
import { parseDecimalBR, type Decimal } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import {
  errosPorCampo,
  telefone,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/validacao";

import { falha, type EstadoFormulario } from "./tipos";

const esquemaFornecedor = z.object({
  nome: textoObrigatorio("Informe o nome do fornecedor."),
  telefone,
  cidade: textoOpcional(80),
  observacao: textoOpcional(500),
});

function revalidarFornecedores(fornecedorId?: string) {
  revalidatePath("/fornecedores");
  revalidatePath("/cotacoes");
  if (fornecedorId) revalidatePath(`/fornecedores/${fornecedorId}`);
}

export async function criarFornecedor(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaFornecedor.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  let fornecedorId: string;
  try {
    const fornecedor = await prisma.fornecedor.create({ data: analise.data });
    fornecedorId = fornecedor.id;
  } catch (erro) {
    return falha(erro, "Não foi possível cadastrar o fornecedor.");
  }

  revalidarFornecedores();
  redirect(`/fornecedores/${fornecedorId}`);
}

export async function editarFornecedor(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Fornecedor não identificado." };

  const analise = esquemaFornecedor.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  try {
    await prisma.fornecedor.update({ where: { id }, data: analise.data });
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o fornecedor.");
  }

  revalidarFornecedores(id);
  return { sucesso: "Fornecedor salvo." };
}

export async function alternarFornecedorAtivo(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id },
    select: { ativo: true },
  });
  if (!fornecedor) return;

  await prisma.fornecedor.update({
    where: { id },
    data: { ativo: !fornecedor.ativo },
  });

  revalidarFornecedores(id);
}

/**
 * Grava a tabela de preços de um fornecedor de uma vez só.
 *
 * É como o trabalho acontece na prática: o fornecedor manda a lista e você
 * digita tudo de uma vez. Cada campo chega como `preco_<produtoId>`.
 *
 * Campo em branco remove o preço — é assim que se diz "este fornecedor não
 * trabalha mais com este produto" sem deixar um valor velho atrapalhando a
 * comparação de melhores preços.
 */
export async function salvarPrecos(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const fornecedorId = String(formData.get("fornecedorId") ?? "");
  if (!fornecedorId) return { erro: "Fornecedor não identificado." };

  const paraGravar: { produtoId: string; preco: Decimal }[] = [];
  const paraRemover: string[] = [];
  const campos: Record<string, string> = {};

  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("preco_")) continue;

    const produtoId = chave.slice("preco_".length);
    const texto = String(valor).trim();

    if (texto === "") {
      paraRemover.push(produtoId);
      continue;
    }

    const preco = parseDecimalBR(texto);
    if (preco === null) {
      campos[chave] = "Valor inválido.";
      continue;
    }
    if (preco.lt(0)) {
      campos[chave] = "Não pode ser negativo.";
      continue;
    }

    paraGravar.push({ produtoId, preco });
  }

  if (Object.keys(campos).length > 0) {
    return { erro: "Confira os preços destacados.", campos };
  }

  try {
    await prisma.$transaction([
      prisma.precoFornecedor.deleteMany({
        where: { fornecedorId, produtoId: { in: paraRemover } },
      }),
      ...paraGravar.map((item) =>
        prisma.precoFornecedor.upsert({
          where: {
            fornecedorId_produtoId: { fornecedorId, produtoId: item.produtoId },
          },
          update: { preco: item.preco },
          create: {
            fornecedorId,
            produtoId: item.produtoId,
            preco: item.preco,
          },
        }),
      ),
    ]);
  } catch (erro) {
    return falha(erro, "Não foi possível salvar os preços.");
  }

  revalidarFornecedores(fornecedorId);
  revalidatePath("/produtos");
  return {
    sucesso: `${paraGravar.length} preço(s) salvos.`,
  };
}
