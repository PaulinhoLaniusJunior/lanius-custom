"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aplicarAjuste, aplicarEntrada } from "@/lib/domain/estoque";
import {
  dataObrigatoria,
  decimalObrigatorio,
  decimalOpcional,
  errosPorCampo,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/validacao";

import { falha, type EstadoFormulario } from "./tipos";

const UNIDADES = [
  "UN",
  "L",
  "ML",
  "KG",
  "G",
  "M",
  "M2",
  "CX",
  "PC",
] as const;

const esquemaProduto = z.object({
  nome: textoObrigatorio("Informe o nome do produto."),
  codigo: textoOpcional(60),
  categoria: textoOpcional(60),
  descricao: textoOpcional(500),
  unidade: z.enum(UNIDADES),
  estoqueMinimo: decimalOpcional("Informe um estoque mínimo válido."),
});

/** Revalida todas as telas que mostram saldo ou valor de estoque. */
function revalidarEstoque(produtoId?: string) {
  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/estoque/entradas");
  if (produtoId) revalidatePath(`/produtos/${produtoId}`);
}

export async function criarProduto(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaProduto.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;
  let produtoId: string;

  try {
    const produto = await prisma.produto.create({
      data: {
        nome: dados.nome,
        codigo: dados.codigo,
        categoria: dados.categoria,
        descricao: dados.descricao,
        unidade: dados.unidade,
        estoqueMinimo: dados.estoqueMinimo ?? 0,
      },
    });
    produtoId = produto.id;
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes("codigo")) {
      return {
        erro: "Já existe um produto com esse código.",
        campos: { codigo: "Código já usado por outro produto." },
      };
    }
    return falha(erro, "Não foi possível cadastrar o produto.");
  }

  revalidarEstoque();
  redirect(`/produtos/${produtoId}`);
}

export async function editarProduto(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Produto não identificado." };

  const analise = esquemaProduto.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  try {
    await prisma.produto.update({
      where: { id },
      data: {
        nome: dados.nome,
        codigo: dados.codigo,
        categoria: dados.categoria,
        descricao: dados.descricao,
        unidade: dados.unidade,
        estoqueMinimo: dados.estoqueMinimo ?? 0,
      },
    });
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o produto.");
  }

  revalidarEstoque(id);
  return { sucesso: "Produto salvo." };
}

export async function alternarProdutoAtivo(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const produto = await prisma.produto.findUnique({
    where: { id },
    select: { ativo: true },
  });
  if (!produto) return;

  await prisma.produto.update({
    where: { id },
    data: { ativo: !produto.ativo },
  });

  revalidarEstoque(id);
}

const esquemaEntrada = z.object({
  produtoId: textoObrigatorio("Escolha o produto."),
  quantidade: decimalObrigatorio("Informe a quantidade que entrou."),
  precoUnitario: decimalObrigatorio("Informe o preço unitário pago."),
  fornecedorId: textoOpcional(40),
  documento: textoOpcional(60),
  data: dataObrigatoria(),
  atualizarPrecoFornecedor: z.coerce.boolean().catch(false),
});

/**
 * Entrada de mercadoria.
 *
 * O movimento e a nova posição do produto são gravados na mesma transação:
 * saldo e custo médio nunca podem ficar fora de sincronia com o histórico.
 */
export async function lancarEntrada(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaEntrada.safeParse({
    ...Object.fromEntries(formData),
    atualizarPrecoFornecedor: formData.get("atualizarPrecoFornecedor") === "on",
  });

  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  if (dados.quantidade.lte(0)) {
    return {
      erro: "A quantidade precisa ser maior que zero.",
      campos: { quantidade: "Maior que zero." },
    };
  }
  if (dados.precoUnitario.lt(0)) {
    return {
      erro: "O preço não pode ser negativo.",
      campos: { precoUnitario: "Não pode ser negativo." },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: dados.produtoId },
        select: { id: true, saldoAtual: true, custoMedio: true },
      });
      if (!produto) throw new Error("Produto não encontrado.");

      const posicao = aplicarEntrada({
        saldoAtual: produto.saldoAtual,
        custoMedio: produto.custoMedio,
        quantidade: dados.quantidade,
        precoUnitario: dados.precoUnitario,
      });

      await tx.produto.update({
        where: { id: produto.id },
        data: {
          saldoAtual: posicao.saldoAtual,
          custoMedio: posicao.custoMedio,
        },
      });

      await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "ENTRADA",
          quantidade: dados.quantidade,
          custoUnitario: dados.precoUnitario,
          custoTotal: dados.quantidade.mul(dados.precoUnitario).toDecimalPlaces(2),
          fornecedorId: dados.fornecedorId,
          documento: dados.documento,
          data: dados.data,
        },
      });

      // Aproveita a compra para manter a tabela de preços do fornecedor viva:
      // é o momento em que se sabe o preço real praticado.
      if (dados.fornecedorId && dados.atualizarPrecoFornecedor) {
        await tx.precoFornecedor.upsert({
          where: {
            fornecedorId_produtoId: {
              fornecedorId: dados.fornecedorId,
              produtoId: produto.id,
            },
          },
          update: { preco: dados.precoUnitario },
          create: {
            fornecedorId: dados.fornecedorId,
            produtoId: produto.id,
            preco: dados.precoUnitario,
          },
        });
      }
    });
  } catch (erro) {
    return falha(erro, "Não foi possível lançar a entrada.");
  }

  revalidarEstoque(dados.produtoId);
  revalidatePath("/fornecedores");
  return { sucesso: "Entrada lançada." };
}

const esquemaAjuste = z.object({
  produtoId: textoObrigatorio("Produto não identificado."),
  saldoContado: decimalObrigatorio("Informe o saldo contado."),
  observacao: textoOpcional(200),
});

/** Ajuste de inventário: acerta o saldo do sistema pelo que foi contado. */
export async function ajustarSaldo(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaAjuste.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  try {
    await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: dados.produtoId },
        select: { id: true, saldoAtual: true, custoMedio: true },
      });
      if (!produto) throw new Error("Produto não encontrado.");

      const ajuste = aplicarAjuste({
        saldoAtual: produto.saldoAtual,
        custoMedio: produto.custoMedio,
        saldoContado: dados.saldoContado,
      });

      if (ajuste.diferenca.isZero()) {
        throw new Error("O saldo contado é igual ao saldo atual: nada a ajustar.");
      }

      await tx.produto.update({
        where: { id: produto.id },
        data: { saldoAtual: ajuste.saldoAtual },
      });

      await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "AJUSTE",
          quantidade: ajuste.diferenca.abs(),
          custoUnitario: ajuste.custoUnitario,
          custoTotal: ajuste.custoTotal,
          observacao:
            dados.observacao ??
            (ajuste.diferenca.gt(0) ? "Sobra no inventário" : "Falta no inventário"),
        },
      });
    });
  } catch (erro) {
    return falha(erro, "Não foi possível ajustar o saldo.");
  }

  revalidarEstoque(dados.produtoId);
  return { sucesso: "Saldo ajustado." };
}
