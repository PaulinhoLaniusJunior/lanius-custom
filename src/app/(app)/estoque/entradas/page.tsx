import type { Metadata } from "next";
import Link from "next/link";

import { FormularioEntrada } from "@/app/(app)/estoque/entradas/formulario-entrada";
import { BotaoLink } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  hojeCampoData,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_UNIDADE } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Entradas de estoque" };

export default async function Entradas(props: PageProps<"/estoque/entradas">) {
  const { produto: produtoInicial } = await props.searchParams;

  const [produtos, fornecedores, ultimas] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        unidade: true,
        saldoAtual: true,
        custoMedio: true,
      },
      orderBy: { nome: "asc" },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.movimentoEstoque.findMany({
      where: { tipo: "ENTRADA" },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      take: 15,
      include: {
        produto: { select: { id: true, nome: true, unidade: true } },
        fornecedor: { select: { nome: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Entrada de estoque"
        descricao="Registre o que chegou, com a quantidade e o preço pago."
      />

      {produtos.length === 0 ? (
        <Cartao>
          <Vazio
            titulo="Nenhum produto cadastrado"
            descricao="Cadastre um produto antes de lançar entradas."
            acao={
              <BotaoLink href="/produtos/novo" tamanho="pequeno">
                Cadastrar produto
              </BotaoLink>
            }
          />
        </Cartao>
      ) : (
        <Cartao className="max-w-3xl">
          <CartaoCorpo>
            <FormularioEntrada
              produtos={produtos.map((produto) => ({
                id: produto.id,
                nome: produto.nome,
                unidade: ROTULO_UNIDADE[produto.unidade],
                saldoAtual: formatarNumero(produto.saldoAtual),
                custoMedio: formatarMoeda(produto.custoMedio),
              }))}
              fornecedores={fornecedores}
              hoje={hojeCampoData()}
              produtoInicial={
                typeof produtoInicial === "string" ? produtoInicial : undefined
              }
            />
          </CartaoCorpo>
        </Cartao>
      )}

      <Cartao>
        <CartaoCabecalho
          titulo="Últimas entradas"
          descricao="Confira se o que você acabou de lançar entrou certo."
        />
        {ultimas.length === 0 ? (
          <Vazio titulo="Nenhuma entrada lançada ainda" />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Data</Th>
                <Th>Produto</Th>
                <Th>Fornecedor</Th>
                <Th>Nota</Th>
                <Th numerico>Qtd.</Th>
                <Th numerico>Preço unit.</Th>
                <Th numerico>Total</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {ultimas.map((entrada) => (
                <Linha key={entrada.id}>
                  <Td className="whitespace-nowrap text-texto-fraco">
                    {formatarData(entrada.data)}
                  </Td>
                  <Td>
                    <Link
                      href={`/produtos/${entrada.produto.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      {entrada.produto.nome}
                    </Link>
                  </Td>
                  <Td className="text-texto-suave">
                    {entrada.fornecedor?.nome ?? (
                      <Etiqueta>Sem fornecedor</Etiqueta>
                    )}
                  </Td>
                  <Td className="text-texto-fraco">{entrada.documento ?? "—"}</Td>
                  <Td numerico>
                    {formatarNumero(entrada.quantidade)}{" "}
                    <span className="text-xs text-texto-fraco">
                      {ROTULO_UNIDADE[entrada.produto.unidade]}
                    </span>
                  </Td>
                  <Td numerico>{formatarMoeda(entrada.custoUnitario)}</Td>
                  <Td numerico>{formatarMoeda(entrada.custoTotal)}</Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
