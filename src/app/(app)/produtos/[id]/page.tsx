import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  FormularioAjuste,
  FormularioEntradaRapida,
} from "@/app/(app)/produtos/[id]/acoes-produto";
import { FormularioProduto } from "@/app/(app)/produtos/formulario-produto";
import { estiloBotao } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Indicador,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { alternarProdutoAtivo } from "@/lib/actions/produtos";
import { dec } from "@/lib/decimal";
import { abaixoDoMinimo, valorEmEstoque } from "@/lib/domain/estoque";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  hojeCampoData,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_MOVIMENTO, ROTULO_UNIDADE } from "@/lib/rotulos";

export async function generateMetadata(
  props: PageProps<"/produtos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    select: { nome: true },
  });
  return { title: produto?.nome ?? "Produto" };
}

export default async function DetalheProduto(props: PageProps<"/produtos/[id]">) {
  const { id } = await props.params;

  const [produto, fornecedores] = await Promise.all([
    prisma.produto.findUnique({
      where: { id },
      include: {
        movimentos: {
          orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
          take: 50,
          include: {
            fornecedor: { select: { nome: true } },
            servico: { select: { id: true, numero: true, cliente: true } },
          },
        },
        precosFornecedor: {
          orderBy: { preco: "asc" },
          include: { fornecedor: { select: { id: true, nome: true, cidade: true } } },
        },
      },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!produto) notFound();

  const unidade = ROTULO_UNIDADE[produto.unidade];
  const falta = abaixoDoMinimo({
    saldoAtual: produto.saldoAtual,
    estoqueMinimo: produto.estoqueMinimo,
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/produtos"
        className="flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para o estoque
      </Link>

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {produto.nome}
            {!produto.ativo && <Etiqueta>Inativo</Etiqueta>}
            {falta && <Etiqueta tom="alerta">Abaixo do mínimo</Etiqueta>}
          </span>
        }
        descricao={
          [produto.codigo, produto.categoria].filter(Boolean).join(" · ") || undefined
        }
        acao={
          <form action={alternarProdutoAtivo}>
            <input type="hidden" name="id" value={produto.id} />
            <button type="submit" className={estiloBotao("secundario", "pequeno")}>
              {produto.ativo ? "Desativar" : "Reativar"}
            </button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Saldo atual"
          valor={`${formatarNumero(produto.saldoAtual)} ${unidade}`}
          tom={falta ? "alerta" : "neutro"}
          detalhe={
            dec(produto.estoqueMinimo).gt(0)
              ? `Mínimo: ${formatarNumero(produto.estoqueMinimo)} ${unidade}`
              : "Sem mínimo definido"
          }
        />
        <Indicador
          rotulo="Custo médio"
          valor={formatarMoeda(produto.custoMedio)}
          detalhe={`por ${unidade}`}
        />
        <Indicador
          rotulo="Valor em estoque"
          valor={formatarMoeda(
            valorEmEstoque({
              saldoAtual: produto.saldoAtual,
              custoMedio: produto.custoMedio,
            }),
          )}
        />
        <Indicador
          rotulo="Melhor preço"
          valor={
            produto.precosFornecedor.length > 0
              ? formatarMoeda(produto.precosFornecedor[0].preco)
              : "—"
          }
          tom="marca"
          detalhe={
            produto.precosFornecedor[0]?.fornecedor.nome ?? "Nenhum preço cadastrado"
          }
        />
      </div>

      <Cartao>
        <CartaoCabecalho
          titulo="Lançar entrada"
          descricao="Cada entrada recalcula o custo médio do produto."
        />
        <CartaoCorpo>
          <FormularioEntradaRapida
            produtoId={produto.id}
            unidade={unidade}
            fornecedores={fornecedores}
            hoje={hojeCampoData()}
          />
        </CartaoCorpo>
      </Cartao>

      {produto.precosFornecedor.length > 0 && (
        <Cartao>
          <CartaoCabecalho
            titulo="Preços dos fornecedores"
            descricao="Do mais barato para o mais caro."
          />
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Fornecedor</Th>
                <Th>Cidade</Th>
                <Th numerico>Preço</Th>
                <Th numerico>Atualizado</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {produto.precosFornecedor.map((preco, indice) => (
                <Linha key={preco.id}>
                  <Td>
                    <Link
                      href={`/fornecedores/${preco.fornecedor.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      {preco.fornecedor.nome}
                    </Link>
                    {indice === 0 && (
                      <Etiqueta tom="positivo" className="ml-2">
                        Mais barato
                      </Etiqueta>
                    )}
                  </Td>
                  <Td className="text-texto-fraco">
                    {preco.fornecedor.cidade ?? "—"}
                  </Td>
                  <Td numerico>{formatarMoeda(preco.preco)}</Td>
                  <Td numerico className="text-texto-fraco">
                    {formatarData(preco.atualizadoEm)}
                  </Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        </Cartao>
      )}

      <Cartao>
        <CartaoCabecalho
          titulo="Histórico de movimentos"
          descricao="Últimos 50 lançamentos."
        />
        {produto.movimentos.length === 0 ? (
          <Vazio
            titulo="Nenhum movimento ainda"
            descricao="Lance a primeira entrada acima para começar o histórico."
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Data</Th>
                <Th>Tipo</Th>
                <Th>Origem / destino</Th>
                <Th numerico>Qtd.</Th>
                <Th numerico>Custo unit.</Th>
                <Th numerico>Total</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {produto.movimentos.map((movimento) => (
                <Linha key={movimento.id}>
                  <Td className="whitespace-nowrap text-texto-fraco">
                    {formatarData(movimento.data)}
                  </Td>
                  <Td>
                    <Etiqueta
                      tom={
                        movimento.tipo === "ENTRADA"
                          ? "positivo"
                          : movimento.tipo === "SAIDA_SERVICO"
                            ? "marca"
                            : movimento.tipo === "ESTORNO_SERVICO"
                              ? "info"
                              : "alerta"
                      }
                    >
                      {ROTULO_MOVIMENTO[movimento.tipo]}
                    </Etiqueta>
                  </Td>
                  <Td className="text-texto-suave">
                    {movimento.servico ? (
                      <Link
                        href={`/servicos/${movimento.servico.id}`}
                        className="hover:text-marca-clara"
                      >
                        #{movimento.servico.numero} {movimento.servico.cliente}
                      </Link>
                    ) : (
                      (movimento.fornecedor?.nome ??
                      movimento.observacao ??
                      movimento.documento ??
                      "—")
                    )}
                  </Td>
                  <Td numerico>{formatarNumero(movimento.quantidade)}</Td>
                  <Td numerico className="text-texto-fraco">
                    {formatarMoeda(movimento.custoUnitario)}
                  </Td>
                  <Td numerico>{formatarMoeda(movimento.custoTotal)}</Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>

      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg border border-borda bg-superficie/40 px-4 py-3 text-sm font-medium text-texto-suave hover:text-texto">
          Editar cadastro e ajustar saldo
        </summary>

        <div className="mt-3 flex flex-col gap-4">
          <Cartao>
            <CartaoCabecalho titulo="Dados do produto" />
            <CartaoCorpo>
              <FormularioProduto
                produto={{
                  id: produto.id,
                  nome: produto.nome,
                  codigo: produto.codigo,
                  categoria: produto.categoria,
                  descricao: produto.descricao,
                  unidade: produto.unidade,
                  estoqueMinimo: produto.estoqueMinimo.toString(),
                }}
              />
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho
              titulo="Ajuste de inventário"
              descricao="Use quando o que está na prateleira não bate com o sistema."
            />
            <CartaoCorpo>
              <FormularioAjuste
                produtoId={produto.id}
                unidade={unidade}
                saldoAtual={formatarNumero(produto.saldoAtual)}
              />
            </CartaoCorpo>
          </Cartao>
        </div>
      </details>
    </div>
  );
}
