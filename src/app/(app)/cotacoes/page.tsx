import type { Metadata } from "next";
import Link from "next/link";

import { FormularioNovaCotacao } from "@/app/(app)/cotacoes/formulario-cotacao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { produtosAbaixoDoMinimo } from "@/lib/queries/estoque";

export const metadata: Metadata = { title: "Cotações" };

export default async function ListaCotacoes() {
  const [cotacoes, emFalta] = await Promise.all([
    prisma.cotacao.findMany({
      orderBy: { criadoEm: "desc" },
      include: { _count: { select: { itens: true } } },
    }),
    produtosAbaixoDoMinimo(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Cotações"
        descricao="Monte a lista de compra, envie ao fornecedor e compare os preços."
      />

      <Cartao>
        <CartaoCabecalho
          titulo="Nova cotação"
          descricao="Depois de criar, escolha os produtos e as quantidades."
        />
        <CartaoCorpo>
          <FormularioNovaCotacao produtosEmFalta={emFalta.length} />
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoCabecalho titulo="Cotações criadas" />
        {cotacoes.length === 0 ? (
          <Vazio
            titulo="Nenhuma cotação ainda"
            descricao="Crie uma acima para montar a lista de produtos que você vai cotar."
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Cotação</Th>
                <Th>Criada em</Th>
                <Th numerico>Produtos</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {cotacoes.map((cotacao) => (
                <Linha key={cotacao.id}>
                  <Td>
                    <Link
                      href={`/cotacoes/${cotacao.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      #{cotacao.numero} {cotacao.titulo ?? "Sem título"}
                    </Link>
                    {cotacao.observacao && (
                      <span className="mt-0.5 block text-xs text-texto-fraco">
                        {cotacao.observacao}
                      </span>
                    )}
                  </Td>
                  <Td className="text-texto-suave">
                    {formatarData(cotacao.criadoEm)}
                  </Td>
                  <Td numerico>
                    {cotacao._count.itens > 0 ? (
                      cotacao._count.itens
                    ) : (
                      <Etiqueta tom="alerta">Vazia</Etiqueta>
                    )}
                  </Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
