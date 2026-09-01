import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth";
import { quantidadeParaRepor } from "@/lib/domain/cotacao";
import { prisma } from "@/lib/prisma";

/**
 * Atalho do painel: cria a cotação já preenchida com os produtos abaixo do
 * mínimo e leva direto para ela.
 *
 * Existe como rota própria para o alerta do painel ser um link simples — o
 * caminho mais curto entre "está faltando tinta" e "lista pronta para cotar".
 */
export default async function NovaCotacaoDireta(
  props: PageProps<"/cotacoes/nova">,
) {
  await exigirSessao();

  const { repor } = await props.searchParams;

  const cotacao = await prisma.cotacao.create({
    data: { titulo: "Reposição de estoque" },
  });

  if (repor === "1") {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true, estoqueMinimo: { gt: 0 } },
      select: { id: true, saldoAtual: true, estoqueMinimo: true },
    });

    const itens = produtos
      .map((produto) => ({
        cotacaoId: cotacao.id,
        produtoId: produto.id,
        quantidade: quantidadeParaRepor({
          saldoAtual: produto.saldoAtual,
          estoqueMinimo: produto.estoqueMinimo,
        }),
      }))
      .filter((item) => item.quantidade.gt(0));

    if (itens.length > 0) {
      await prisma.cotacaoItem.createMany({ data: itens });
    }
  }

  redirect(`/cotacoes/${cotacao.id}`);
}
