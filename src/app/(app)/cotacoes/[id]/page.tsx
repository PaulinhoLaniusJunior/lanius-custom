import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";

import {
  MontarItens,
  type LinhaItem,
} from "@/app/(app)/cotacoes/[id]/montar-itens";
import { FormularioEditarCotacao } from "@/app/(app)/cotacoes/formulario-cotacao";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { CabecalhoImpressao } from "@/components/cabecalho-impressao";
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
import { excluirCotacao } from "@/lib/actions/cotacoes";
import { dec } from "@/lib/decimal";
import {
  agruparPorFornecedor,
  economiaTotal,
  melhoresPrecos,
  quantidadeParaRepor,
  type ItemCotacao,
  type PrecoDeFornecedor,
} from "@/lib/domain/cotacao";
import { abaixoDoMinimo } from "@/lib/domain/estoque";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  formatarTelefone,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_UNIDADE } from "@/lib/rotulos";

export async function generateMetadata(
  props: PageProps<"/cotacoes/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const cotacao = await prisma.cotacao.findUnique({
    where: { id },
    select: { numero: true, titulo: true },
  });
  return {
    title: cotacao ? `Cotação #${cotacao.numero}` : "Cotação",
  };
}

const ABAS = [
  { valor: "montar", rotulo: "Montar lista" },
  { valor: "pedido", rotulo: "Pedido de cotação" },
  { valor: "precos", rotulo: "Melhores preços" },
] as const;

export default async function DetalheCotacao(props: PageProps<"/cotacoes/[id]">) {
  const { id } = await props.params;
  const { aba: abaBruta } = await props.searchParams;
  const aba = typeof abaBruta === "string" ? abaBruta : "montar";

  const [cotacao, produtos] = await Promise.all([
    prisma.cotacao.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            produto: { select: { id: true, nome: true, unidade: true } },
          },
        },
      },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        categoria: true,
        unidade: true,
        saldoAtual: true,
        estoqueMinimo: true,
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!cotacao) notFound();

  const quantidadePorProduto = new Map(
    cotacao.itens.map((item) => [item.produtoId, item.quantidade]),
  );

  // Itens da cotação em ordem alfabética — a ordem em que o fornecedor lê.
  const itens: ItemCotacao[] = cotacao.itens
    .map((item) => ({
      produtoId: item.produtoId,
      produtoNome: item.produto.nome,
      unidade: ROTULO_UNIDADE[item.produto.unidade],
      quantidade: dec(item.quantidade),
    }))
    .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, "pt-BR"));

  const precos = await prisma.precoFornecedor.findMany({
    where: { produtoId: { in: itens.map((item) => item.produtoId) } },
    include: {
      fornecedor: {
        select: { id: true, nome: true, telefone: true, cidade: true, ativo: true },
      },
    },
  });

  const candidatos: PrecoDeFornecedor[] = precos
    .filter((preco) => preco.fornecedor.ativo)
    .map((preco) => ({
      produtoId: preco.produtoId,
      fornecedorId: preco.fornecedor.id,
      fornecedorNome: preco.fornecedor.nome,
      fornecedorTelefone: preco.fornecedor.telefone,
      fornecedorCidade: preco.fornecedor.cidade,
      preco: dec(preco.preco),
      atualizadoEm: preco.atualizadoEm,
    }));

  const resultado = melhoresPrecos(itens, candidatos);
  const grupos = agruparPorFornecedor(resultado.encontrados);
  const economia = economiaTotal(resultado.encontrados);

  const linhas: LinhaItem[] = produtos.map((produto) => {
    const naCotacao = quantidadePorProduto.get(produto.id);
    const falta = quantidadeParaRepor({
      saldoAtual: produto.saldoAtual,
      estoqueMinimo: produto.estoqueMinimo,
    });

    return {
      produtoId: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      unidade: ROTULO_UNIDADE[produto.unidade],
      quantidade: naCotacao ? formatarNumero(naCotacao).replace(/\./g, "") : "",
      saldo: formatarNumero(produto.saldoAtual),
      abaixoDoMinimo: abaixoDoMinimo({
        saldoAtual: produto.saldoAtual,
        estoqueMinimo: produto.estoqueMinimo,
      }),
      sugestao: falta.gt(0)
        ? `${formatarNumero(falta)} ${ROTULO_UNIDADE[produto.unidade]}`
        : null,
    };
  });

  const titulo = cotacao.titulo ?? `Cotação #${cotacao.numero}`;
  const dataCotacao = formatarData(cotacao.criadoEm);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/cotacoes"
        className="nao-imprimir flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para cotações
      </Link>

      <div className="nao-imprimir">
        <CabecalhoPagina
          titulo={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-texto-fraco">#{cotacao.numero}</span>
              {titulo}
            </span>
          }
          descricao={`Criada em ${dataCotacao} · ${itens.length} produto(s)`}
        />
      </div>

      <nav className="nao-imprimir flex gap-1 overflow-x-auto rounded-lg border border-borda bg-superficie/40 p-1">
        {ABAS.map((item) => (
          <Link
            key={item.valor}
            href={`/cotacoes/${cotacao.id}?aba=${item.valor}`}
            aria-current={aba === item.valor ? "page" : undefined}
            className={
              aba === item.valor
                ? "flex-1 rounded-md bg-marca/15 px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-texto"
                : "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-texto-fraco hover:text-texto"
            }
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "montar" && (
        <>
          <Cartao>
            <CartaoCabecalho
              titulo="Produtos da cotação"
              descricao="Digite a quantidade de cada produto que você vai cotar."
            />
            <MontarItens cotacaoId={cotacao.id} linhas={linhas} />
          </Cartao>

          <details className="nao-imprimir group">
            <summary className="cursor-pointer list-none rounded-lg border border-borda bg-superficie/40 px-4 py-3 text-sm font-medium text-texto-suave hover:text-texto">
              Título, observação e exclusão
            </summary>
            <Cartao className="mt-3 max-w-2xl">
              <CartaoCorpo className="flex flex-col gap-4">
                <FormularioEditarCotacao
                  cotacao={{
                    id: cotacao.id,
                    titulo: cotacao.titulo,
                    observacao: cotacao.observacao,
                  }}
                />
                <form
                  action={excluirCotacao}
                  className="flex justify-end border-t border-borda pt-3"
                >
                  <input type="hidden" name="cotacaoId" value={cotacao.id} />
                  <button type="submit" className={estiloBotao("perigo", "pequeno")}>
                    Excluir cotação
                  </button>
                </form>
              </CartaoCorpo>
            </Cartao>
          </details>
        </>
      )}

      {aba === "pedido" && (
        <>
          <div className="nao-imprimir flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda bg-superficie/40 p-3">
            <p className="text-sm text-texto-suave">
              Folha <strong className="text-texto">sem preços</strong> para o
              fornecedor preencher. No celular, a impressão permite salvar em PDF.
            </p>
            <BotaoImprimir>Imprimir pedido</BotaoImprimir>
          </div>

          <Cartao className="area-impressao">
            <CabecalhoImpressao
              titulo={`Pedido de cotação #${cotacao.numero}`}
              subtitulo={`${titulo} · ${dataCotacao}`}
            />

            <div className="nao-imprimir">
              <CartaoCabecalho
                titulo="Pedido de cotação"
                descricao="É isto que sai impresso — confira antes de enviar."
              />
            </div>

            {itens.length === 0 ? (
              <Vazio
                titulo="Cotação sem produtos"
                descricao="Volte para “Montar lista” e informe o que você quer cotar."
              />
            ) : (
              <>
                {cotacao.observacao && (
                  <p className="border-b border-borda px-4 py-3 text-sm text-texto-suave">
                    {cotacao.observacao}
                  </p>
                )}

                <Tabela>
                  <Cabecalho>
                    <tr>
                      <Th className="w-10">#</Th>
                      <Th>Produto</Th>
                      <Th>Unid.</Th>
                      <Th numerico>Quantidade</Th>
                      {/* Colunas em branco: o fornecedor preenche à mão. */}
                      <Th numerico className="w-28">
                        Preço unit.
                      </Th>
                      <Th numerico className="w-28">
                        Total
                      </Th>
                    </tr>
                  </Cabecalho>
                  <Corpo>
                    {itens.map((item, indice) => (
                      <Linha key={item.produtoId}>
                        <Td className="text-texto-fraco">{indice + 1}</Td>
                        <Td className="font-medium">{item.produtoNome}</Td>
                        <Td className="text-texto-suave">{item.unidade}</Td>
                        <Td numerico>{formatarNumero(item.quantidade)}</Td>
                        <Td numerico className="h-9" />
                        <Td numerico className="h-9" />
                      </Linha>
                    ))}
                  </Corpo>
                </Tabela>

                <div className="so-impressao mt-6 text-[10pt]">
                  <p>Fornecedor: _______________________________________________</p>
                  <p className="mt-4">
                    Prazo de entrega: ____________ Condição de pagamento:
                    ____________
                  </p>
                  <p className="mt-4">Total geral: R$ ____________</p>
                </div>
              </>
            )}
          </Cartao>
        </>
      )}

      {aba === "precos" && (
        <>
          <div className="nao-imprimir flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda bg-superficie/40 p-3">
            <p className="text-sm text-texto-suave">
              O menor preço de cada produto entre os preços já cadastrados, agrupado
              por fornecedor na impressão.
            </p>
            <BotaoImprimir>Imprimir lista de compra</BotaoImprimir>
          </div>

          {itens.length === 0 ? (
            <Cartao>
              <Vazio
                titulo="Cotação sem produtos"
                descricao="Volte para “Montar lista” e informe o que você quer cotar."
              />
            </Cartao>
          ) : (
            <>
              <div className="nao-imprimir grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Indicador
                  rotulo="Total pelo menor preço"
                  valor={formatarMoeda(resultado.total)}
                  tom="marca"
                />
                <Indicador
                  rotulo="Economia"
                  valor={formatarMoeda(economia)}
                  tom={economia.gt(0) ? "positivo" : "neutro"}
                  detalhe="Contra comprar no mais caro"
                />
                <Indicador rotulo="Fornecedores" valor={grupos.length} />
                <Indicador
                  rotulo="Sem preço"
                  valor={resultado.semPreco.length}
                  tom={resultado.semPreco.length > 0 ? "alerta" : "neutro"}
                  detalhe="Precisam ser cotados"
                />
              </div>

              <Cartao className="area-impressao">
                <CabecalhoImpressao
                  titulo={`Lista de compra #${cotacao.numero}`}
                  subtitulo={`${titulo} · ${dataCotacao} · menores preços cadastrados`}
                />

                <div className="nao-imprimir">
                  <CartaoCabecalho
                    titulo="Melhores preços por fornecedor"
                    descricao="Cada produto vai para o fornecedor mais barato. Na impressão, uma seção por fornecedor."
                  />
                </div>

                {grupos.length === 0 ? (
                  <Vazio
                    titulo="Nenhum preço cadastrado"
                    descricao="Informe os preços dos fornecedores para o sistema poder comparar."
                  />
                ) : (
                  <div className="flex flex-col">
                    {grupos.map((grupo) => (
                      <section
                        key={grupo.fornecedorId}
                        className="grupo-fornecedor border-b border-borda last:border-0"
                      >
                        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                          <div>
                            <h3 className="font-semibold text-texto">
                              {grupo.fornecedorNome}
                            </h3>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-texto-fraco">
                              {grupo.fornecedorCidade && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" aria-hidden />
                                  {grupo.fornecedorCidade}
                                </span>
                              )}
                              {grupo.fornecedorTelefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3" aria-hidden />
                                  {formatarTelefone(grupo.fornecedorTelefone)}
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="text-sm tabular text-texto-suave">
                            Subtotal{" "}
                            <strong className="text-texto">
                              {formatarMoeda(grupo.subtotal)}
                            </strong>
                          </p>
                        </header>

                        <Tabela>
                          <Cabecalho>
                            <tr>
                              <Th>Produto</Th>
                              <Th>Unid.</Th>
                              <Th numerico>Qtd.</Th>
                              <Th numerico>Preço unit.</Th>
                              <Th numerico>Total</Th>
                            </tr>
                          </Cabecalho>
                          <Corpo>
                            {grupo.linhas.map((linha) => (
                              <Linha key={linha.item.produtoId}>
                                <Td className="font-medium">
                                  {linha.item.produtoNome}
                                  {linha.economia && (
                                    <span className="nao-imprimir ml-2 text-xs text-sucesso">
                                      economiza {formatarMoeda(linha.economia)}
                                    </span>
                                  )}
                                </Td>
                                <Td className="text-texto-suave">
                                  {linha.item.unidade}
                                </Td>
                                <Td numerico>
                                  {formatarNumero(linha.item.quantidade)}
                                </Td>
                                <Td numerico>{formatarMoeda(linha.preco)}</Td>
                                <Td numerico>{formatarMoeda(linha.subtotal)}</Td>
                              </Linha>
                            ))}
                          </Corpo>
                        </Tabela>
                      </section>
                    ))}

                    <div className="flex items-center justify-between gap-4 px-4 py-3 font-semibold">
                      <span>Total geral</span>
                      <span className="tabular">
                        {formatarMoeda(resultado.total)}
                      </span>
                    </div>
                  </div>
                )}

                {resultado.semPreco.length > 0 && (
                  <section className="grupo-fornecedor border-t border-alerta/40">
                    <header className="px-4 py-3">
                      <h3 className="flex items-center gap-2 font-semibold text-alerta">
                        Sem preço cadastrado
                        <Etiqueta tom="alerta">
                          {resultado.semPreco.length}
                        </Etiqueta>
                      </h3>
                      <p className="mt-0.5 text-xs text-texto-fraco">
                        Estes produtos precisam ser cotados — nenhum fornecedor tem
                        preço registrado para eles.
                      </p>
                    </header>

                    <Tabela>
                      <Cabecalho>
                        <tr>
                          <Th>Produto</Th>
                          <Th>Unid.</Th>
                          <Th numerico>Qtd.</Th>
                        </tr>
                      </Cabecalho>
                      <Corpo>
                        {resultado.semPreco.map((item) => (
                          <Linha key={item.produtoId}>
                            <Td className="font-medium">{item.produtoNome}</Td>
                            <Td className="text-texto-suave">{item.unidade}</Td>
                            <Td numerico>{formatarNumero(item.quantidade)}</Td>
                          </Linha>
                        ))}
                      </Corpo>
                    </Tabela>
                  </section>
                )}
              </Cartao>
            </>
          )}
        </>
      )}
    </div>
  );
}
