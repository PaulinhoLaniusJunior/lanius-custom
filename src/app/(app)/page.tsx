import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, Plus } from "lucide-react";

import { BotaoLink } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  Etiqueta,
  Indicador,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { dec } from "@/lib/decimal";
import { diasCorridos } from "@/lib/domain/servico";
import {
  formatarData,
  formatarMoeda,
  formatarQuantidade,
} from "@/lib/format";
import {
  produtosAbaixoDoMinimo,
  valorTotalDoEstoque,
} from "@/lib/queries/estoque";
import { listarServicosComResumo } from "@/lib/queries/servicos";
import { prisma } from "@/lib/prisma";

export default async function Painel() {
  const [emAndamento, emFalta, valorEstoque, ultimosMovimentos] =
    await Promise.all([
      listarServicosComResumo({ status: ["EM_ANDAMENTO", "ORCAMENTO"] }),
      produtosAbaixoDoMinimo(),
      valorTotalDoEstoque(),
      prisma.movimentoEstoque.findMany({
        orderBy: { criadoEm: "desc" },
        take: 8,
        include: {
          produto: { select: { nome: true, unidade: true } },
          servico: { select: { id: true, numero: true, cliente: true } },
          fornecedor: { select: { nome: true } },
        },
      }),
    ]);

  const totalOrcado = emAndamento.reduce(
    (soma, servico) => soma.plus(servico.resumo.valorOrcado),
    dec(0),
  );

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo="Painel"
        descricao="O que está aberto na oficina hoje."
        acao={
          <BotaoLink href="/servicos/novo">
            <Plus className="size-4" aria-hidden />
            Novo serviço
          </BotaoLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Serviços abertos"
          valor={emAndamento.length}
          detalhe={`${formatarMoeda(totalOrcado)} orçados`}
        />
        <Indicador
          rotulo="Valor em estoque"
          valor={formatarMoeda(valorEstoque)}
          detalhe="Saldo × custo médio"
        />
        <Indicador
          rotulo="Abaixo do mínimo"
          valor={emFalta.length}
          tom={emFalta.length > 0 ? "alerta" : "neutro"}
          detalhe={emFalta.length > 0 ? "Precisa repor" : "Estoque em dia"}
        />
        <Indicador
          rotulo="Movimentos"
          valor={ultimosMovimentos.length}
          detalhe="Últimos lançamentos"
        />
      </div>

      {emFalta.length > 0 && (
        <Cartao className="border-alerta/40">
          <CartaoCabecalho
            titulo={
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-alerta" aria-hidden />
                Produtos abaixo do mínimo
              </span>
            }
            descricao="Monte uma cotação com estes itens em um clique."
            acao={
              <BotaoLink
                href="/cotacoes/nova?repor=1"
                variante="secundario"
                tamanho="pequeno"
              >
                Gerar cotação
              </BotaoLink>
            }
          />
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Produto</Th>
                <Th numerico>Saldo</Th>
                <Th numerico>Mínimo</Th>
                <Th numerico>Faltando</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {emFalta.map((produto) => (
                <Linha key={produto.id}>
                  <Td>
                    <Link
                      href={`/produtos/${produto.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      {produto.nome}
                    </Link>
                  </Td>
                  <Td numerico className="text-alerta">
                    {formatarQuantidade(produto.saldoAtual, produto.unidade)}
                  </Td>
                  <Td numerico className="text-texto-fraco">
                    {formatarQuantidade(produto.estoqueMinimo, produto.unidade)}
                  </Td>
                  <Td numerico>
                    {formatarQuantidade(produto.faltando, produto.unidade)}
                  </Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        </Cartao>
      )}

      <Cartao>
        <CartaoCabecalho
          titulo="Serviços em andamento"
          acao={
            <Link
              href="/servicos"
              className="flex items-center gap-1 text-sm text-texto-suave hover:text-marca-clara"
            >
              Ver todos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        {emAndamento.length === 0 ? (
          <Vazio
            titulo="Nenhum serviço aberto"
            descricao="Cadastre um serviço para começar a lançar produtos, gastos e dias trabalhados."
            acao={
              <BotaoLink href="/servicos/novo" tamanho="pequeno">
                Cadastrar serviço
              </BotaoLink>
            }
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Serviço</Th>
                <Th>Veículo</Th>
                <Th numerico>Orçado</Th>
                <Th numerico>Custo</Th>
                <Th numerico>Margem</Th>
                <Th numerico>Dias</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {emAndamento.map((servico) => (
                <Linha key={servico.id}>
                  <Td>
                    <Link
                      href={`/servicos/${servico.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      #{servico.numero} {servico.cliente}
                    </Link>
                    <span className="mt-0.5 block text-xs text-texto-fraco">
                      Desde {formatarData(servico.dataInicio)}
                    </span>
                  </Td>
                  <Td>
                    {servico.veiculo}
                    {servico.placa && (
                      <span className="ml-1 text-xs text-texto-fraco">
                        {servico.placa}
                      </span>
                    )}
                  </Td>
                  <Td numerico>{formatarMoeda(servico.resumo.valorOrcado)}</Td>
                  <Td numerico className="text-texto-suave">
                    {formatarMoeda(servico.resumo.custoTotal)}
                  </Td>
                  <Td numerico>
                    <Etiqueta
                      tom={servico.resumo.margem.gte(0) ? "positivo" : "negativo"}
                    >
                      {formatarMoeda(servico.resumo.margem)}
                    </Etiqueta>
                  </Td>
                  <Td numerico className="text-texto-fraco">
                    {diasCorridos(servico.dataInicio, servico.dataConclusao)}
                  </Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>

      <Cartao>
        <CartaoCabecalho
          titulo="Últimas movimentações de estoque"
          acao={
            <BotaoLink
              href="/estoque/entradas"
              variante="secundario"
              tamanho="pequeno"
            >
              <Package className="size-4" aria-hidden />
              Lançar entrada
            </BotaoLink>
          }
        />
        {ultimosMovimentos.length === 0 ? (
          <Vazio
            titulo="Nenhum movimento ainda"
            descricao="Cadastre produtos e lance a primeira entrada de mercadoria."
            acao={
              <BotaoLink href="/produtos/novo" tamanho="pequeno">
                Cadastrar produto
              </BotaoLink>
            }
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Data</Th>
                <Th>Produto</Th>
                <Th>Tipo</Th>
                <Th>Origem / destino</Th>
                <Th numerico>Qtd.</Th>
                <Th numerico>Valor</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {ultimosMovimentos.map((movimento) => (
                <Linha key={movimento.id}>
                  <Td className="whitespace-nowrap text-texto-fraco">
                    {formatarData(movimento.data)}
                  </Td>
                  <Td className="font-medium">{movimento.produto.nome}</Td>
                  <Td>
                    {movimento.tipo === "ENTRADA" ? (
                      <Etiqueta tom="positivo">Entrada</Etiqueta>
                    ) : movimento.tipo === "SAIDA_SERVICO" ? (
                      <Etiqueta tom="marca">Saída</Etiqueta>
                    ) : movimento.tipo === "ESTORNO_SERVICO" ? (
                      <Etiqueta tom="info">Estorno</Etiqueta>
                    ) : (
                      <Etiqueta tom="alerta">Ajuste</Etiqueta>
                    )}
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
                      (movimento.fornecedor?.nome ?? "-")
                    )}
                  </Td>
                  <Td numerico>
                    {formatarQuantidade(
                      movimento.quantidade,
                      movimento.produto.unidade,
                    )}
                  </Td>
                  <Td numerico>{formatarMoeda(movimento.custoTotal)}</Td>
                </Linha>
              ))}
            </Corpo>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
