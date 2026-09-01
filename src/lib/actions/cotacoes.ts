"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth";
import { parseDecimalBR, type Decimal } from "@/lib/decimal";
import { quantidadeParaRepor } from "@/lib/domain/cotacao";
import { prisma } from "@/lib/prisma";

import { falha, type EstadoFormulario } from "./tipos";

function revalidarCotacoes(cotacaoId?: string) {
  revalidatePath("/cotacoes");
  if (cotacaoId) revalidatePath(`/cotacoes/${cotacaoId}`);
}

/**
 * Cria uma cotação.
 *
 * Com `repor=1` a cotação já nasce preenchida com os produtos abaixo do
 * estoque mínimo, na quantidade que falta para chegar lá — que é o motivo
 * mais comum de sair cotando preço.
 */
export async function criarCotacao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  const preencherComFaltantes = formData.get("repor") === "1";

  let cotacaoId: string;

  try {
    const cotacao = await prisma.cotacao.create({
      data: { titulo, observacao },
    });
    cotacaoId = cotacao.id;

    if (preencherComFaltantes) {
      const produtos = await prisma.produto.findMany({
        where: { ativo: true, estoqueMinimo: { gt: 0 } },
        select: { id: true, saldoAtual: true, estoqueMinimo: true },
      });

      const itens = produtos
        .map((produto) => ({
          produtoId: produto.id,
          quantidade: quantidadeParaRepor({
            saldoAtual: produto.saldoAtual,
            estoqueMinimo: produto.estoqueMinimo,
          }),
        }))
        .filter((item) => item.quantidade.gt(0));

      if (itens.length > 0) {
        await prisma.cotacaoItem.createMany({
          data: itens.map((item) => ({ ...item, cotacaoId })),
        });
      }
    }
  } catch (erro) {
    return falha(erro, "Não foi possível criar a cotação.");
  }

  revalidarCotacoes();
  redirect(`/cotacoes/${cotacaoId}`);
}

export async function editarCotacao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Cotação não identificada." };

  try {
    await prisma.cotacao.update({
      where: { id },
      data: {
        titulo: String(formData.get("titulo") ?? "").trim() || null,
        observacao: String(formData.get("observacao") ?? "").trim() || null,
      },
    });
  } catch (erro) {
    return falha(erro, "Não foi possível salvar a cotação.");
  }

  revalidarCotacoes(id);
  return { sucesso: "Cotação salva." };
}

export async function excluirCotacao(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("cotacaoId") ?? "");
  if (!id) return;

  await prisma.cotacao.delete({ where: { id } });
  revalidarCotacoes();
  redirect("/cotacoes");
}

/**
 * Grava os itens da cotação de uma vez.
 *
 * Cada campo chega como `qtd_<produtoId>`; quantidade em branco ou zero
 * remove o produto da lista. Assim a montagem é uma tela só: você percorre
 * o catálogo e digita o que precisa.
 */
export async function salvarItens(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const cotacaoId = String(formData.get("cotacaoId") ?? "");
  if (!cotacaoId) return { erro: "Cotação não identificada." };

  const paraGravar: { produtoId: string; quantidade: Decimal }[] = [];
  const paraRemover: string[] = [];
  const campos: Record<string, string> = {};

  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("qtd_")) continue;

    const produtoId = chave.slice("qtd_".length);
    const texto = String(valor).trim();

    if (texto === "") {
      paraRemover.push(produtoId);
      continue;
    }

    const quantidade = parseDecimalBR(texto);
    if (quantidade === null) {
      campos[chave] = "Valor inválido.";
      continue;
    }
    if (quantidade.lt(0)) {
      campos[chave] = "Não pode ser negativo.";
      continue;
    }
    if (quantidade.isZero()) {
      paraRemover.push(produtoId);
      continue;
    }

    paraGravar.push({ produtoId, quantidade });
  }

  if (Object.keys(campos).length > 0) {
    return { erro: "Confira as quantidades destacadas.", campos };
  }

  try {
    await prisma.$transaction([
      prisma.cotacaoItem.deleteMany({
        where: { cotacaoId, produtoId: { in: paraRemover } },
      }),
      ...paraGravar.map((item) =>
        prisma.cotacaoItem.upsert({
          where: {
            cotacaoId_produtoId: { cotacaoId, produtoId: item.produtoId },
          },
          update: { quantidade: item.quantidade },
          create: {
            cotacaoId,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
          },
        }),
      ),
    ]);
  } catch (erro) {
    return falha(erro, "Não foi possível salvar os itens.");
  }

  revalidarCotacoes(cotacaoId);
  return {
    sucesso:
      paraGravar.length === 0
        ? "Cotação sem itens."
        : `${paraGravar.length} produto(s) na cotação.`,
  };
}
