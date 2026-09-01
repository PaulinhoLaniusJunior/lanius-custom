import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { BotaoLink } from "@/components/ui/botao";
import { Entrada } from "@/components/ui/campo";
import {
  CabecalhoPagina,
  Cartao,
  Etiqueta,
  Indicador,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { dec } from "@/lib/decimal";
import { abaixoDoMinimo, valorEmEstoque } from "@/lib/domain/estoque";
import { formatarMoeda, formatarNumero } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_UNIDADE } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Estoque" };

export default async function ListaProdutos(props: PageProps<"/produtos">) {
  const { busca = "", inativos } = await props.searchParams;
  const termo = typeof busca === "string" ? busca.trim() : "";
  const mostrarInativos = inativos === "1";

  const produtos = await prisma.produto.findMany({
    where: {
      ...(mostrarInativos ? {} : { ativo: true }),
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { codigo: { contains: termo, mode: "insensitive" } },
              { categoria: { contains: termo, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nome: "asc" },
  });

  const valorTotal = produtos.reduce(
    (soma, produto) =>
      soma.plus(
        valorEmEstoque({
          saldoAtual: produto.saldoAtual,
          custoMedio: produto.custoMedio,
        }),
      ),
    dec(0),
  );

  const emFalta = produtos.filter((produto) =>
    abaixoDoMinimo({
      saldoAtual: produto.saldoAtual,
      estoqueMinimo: produto.estoqueMinimo,
    }),
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Produtos, saldo e custo médio."
        acao={
          <div className="flex gap-2">
            <BotaoLink href="/estoque/entradas" variante="secundario">
              Lançar entrada
            </BotaoLink>
            <BotaoLink href="/produtos/novo">
              <Plus className="size-4" aria-hidden />
              Produto
            </BotaoLink>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador rotulo="Produtos" valor={produtos.length} />
        <Indicador rotulo="Valor em estoque" valor={formatarMoeda(valorTotal)} />
        <Indicador
          rotulo="Abaixo do mínimo"
          valor={emFalta}
          tom={emFalta > 0 ? "alerta" : "neutro"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <Cartao>
        <form className="flex flex-wrap items-center gap-3 border-b border-borda p-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-fraco"
              aria-hidden
            />
            <Entrada
              name="busca"
              defaultValue={termo}
              placeholder="Buscar por nome, código ou categoria"
              className="pl-9"
              aria-label="Buscar produto"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-texto-suave">
            <input
              type="checkbox"
              name="inativos"
              value="1"
              defaultChecked={mostrarInativos}
              className="size-4 accent-marca"
            />
            Mostrar inativos
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-borda-forte px-4 text-sm font-medium text-texto-suave hover:border-prata/50 hover:text-texto"
          >
            Filtrar
          </button>
        </form>

        {produtos.length === 0 ? (
          <Vazio
            titulo={termo ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            descricao={
              termo
                ? "Tente outro termo de busca."
                : "Cadastre os produtos que você compra para começar a controlar o estoque."
            }
            acao={
              !termo && (
                <BotaoLink href="/produtos/novo" tamanho="pequeno">
                  Cadastrar produto
                </BotaoLink>
              )
            }
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Produto</Th>
                <Th numerico>Saldo</Th>
                <Th numerico>Mínimo</Th>
                <Th numerico>Custo médio</Th>
                <Th numerico>Valor</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {produtos.map((produto) => {
                const falta = abaixoDoMinimo({
                  saldoAtual: produto.saldoAtual,
                  estoqueMinimo: produto.estoqueMinimo,
                });

                return (
                  <Linha key={produto.id}>
                    <Td>
                      <Link
                        href={`/produtos/${produto.id}`}
                        className="font-medium text-texto hover:text-marca-clara"
                      >
                        {produto.nome}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-texto-fraco">
                        {produto.codigo && <span>{produto.codigo}</span>}
                        {produto.categoria && <span>· {produto.categoria}</span>}
                        {!produto.ativo && <Etiqueta>Inativo</Etiqueta>}
                      </span>
                    </Td>
                    <Td numerico>
                      <span className={falta ? "text-alerta" : undefined}>
                        {formatarNumero(produto.saldoAtual)}{" "}
                        <span className="text-xs text-texto-fraco">
                          {ROTULO_UNIDADE[produto.unidade]}
                        </span>
                      </span>
                    </Td>
                    <Td numerico className="text-texto-fraco">
                      {dec(produto.estoqueMinimo).gt(0)
                        ? formatarNumero(produto.estoqueMinimo)
                        : "—"}
                    </Td>
                    <Td numerico>{formatarMoeda(produto.custoMedio)}</Td>
                    <Td numerico className="text-texto-suave">
                      {formatarMoeda(
                        valorEmEstoque({
                          saldoAtual: produto.saldoAtual,
                          custoMedio: produto.custoMedio,
                        }),
                      )}
                    </Td>
                  </Linha>
                );
              })}
            </Corpo>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
