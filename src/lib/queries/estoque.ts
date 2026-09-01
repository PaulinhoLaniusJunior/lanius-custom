import "server-only";

import { Decimal, dec } from "@/lib/decimal";
import { abaixoDoMinimo, valorEmEstoque } from "@/lib/domain/estoque";
import { prisma } from "@/lib/prisma";

/**
 * Consultas de estoque compartilhadas entre o painel, a lista de produtos e a
 * montagem de cotacoes.
 */

export type ProdutoEmFalta = {
  id: string;
  nome: string;
  unidade: string;
  saldoAtual: Decimal;
  estoqueMinimo: Decimal;
  faltando: Decimal;
};

/**
 * Produtos ativos cujo saldo caiu abaixo do minimo definido.
 * O filtro fica em memoria porque a comparacao e entre duas colunas — o
 * cadastro tem poucas centenas de itens, entao o custo e irrelevante.
 */
export async function produtosAbaixoDoMinimo(): Promise<ProdutoEmFalta[]> {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, estoqueMinimo: { gt: 0 } },
    select: {
      id: true,
      nome: true,
      unidade: true,
      saldoAtual: true,
      estoqueMinimo: true,
    },
    orderBy: { nome: "asc" },
  });

  return produtos
    .filter((produto) =>
      abaixoDoMinimo({
        saldoAtual: dec(produto.saldoAtual),
        estoqueMinimo: dec(produto.estoqueMinimo),
      }),
    )
    .map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      unidade: produto.unidade,
      saldoAtual: dec(produto.saldoAtual),
      estoqueMinimo: dec(produto.estoqueMinimo),
      faltando: dec(produto.estoqueMinimo).minus(dec(produto.saldoAtual)),
    }));
}

/** Soma de saldo x custo medio de todos os produtos ativos. */
export async function valorTotalDoEstoque(): Promise<Decimal> {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    select: { saldoAtual: true, custoMedio: true },
  });

  let total = new Decimal(0);
  for (const produto of produtos) {
    total = total.plus(
      valorEmEstoque({
        saldoAtual: dec(produto.saldoAtual),
        custoMedio: dec(produto.custoMedio),
      }),
    );
  }
  return total;
}
