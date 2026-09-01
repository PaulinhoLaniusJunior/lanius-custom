import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, X } from "lucide-react";

import {
  FormularioAlocacao,
  FormularioDias,
  FormularioGasto,
  FormularioProdutoNoServico,
  type FuncionarioDisponivel,
  type ProdutoDisponivel,
} from "@/app/(app)/servicos/[id]/lancamentos";
import { FormularioServico } from "@/app/(app)/servicos/formulario-servico";
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
import {
  estornarProdutoDoServico,
  mudarStatus,
  removerAlocacao,
  removerDia,
  removerGasto,
} from "@/lib/actions/servicos";
import { custoDaAlocacao, explicarCalculo } from "@/lib/domain/mao-de-obra";
import { diasCorridos } from "@/lib/domain/servico";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  formatarTelefone,
  hojeCampoData,
  linkWhatsapp,
  paraCampoData,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buscarServicoCompleto, calcularResumo } from "@/lib/queries/servicos";
import {
  ROTULO_CATEGORIA_GASTO,
  ROTULO_REMUNERACAO,
  ROTULO_STATUS_SERVICO,
  ROTULO_UNIDADE,
} from "@/lib/rotulos";

export async function generateMetadata(
  props: PageProps<"/servicos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const servico = await prisma.servico.findUnique({
    where: { id },
    select: { numero: true, cliente: true },
  });
  return {
    title: servico ? `#${servico.numero} ${servico.cliente}` : "Serviço",
  };
}

const ABAS = [
  { valor: "resumo", rotulo: "Resumo" },
  { valor: "produtos", rotulo: "Produtos" },
  { valor: "gastos", rotulo: "Gastos" },
  { valor: "equipe", rotulo: "Equipe e dias" },
] as const;

export default async function DetalheServico(props: PageProps<"/servicos/[id]">) {
  const { id } = await props.params;
  const { aba: abaBruta } = await props.searchParams;
  const aba = typeof abaBruta === "string" ? abaBruta : "resumo";

  const servico = await buscarServicoCompleto(id);
  if (!servico) notFound();

  const [produtos, funcionarios] = await Promise.all([
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
    prisma.funcionario.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const resumo = calcularResumo(servico);
  const hoje = hojeCampoData();
  const whatsapp = linkWhatsapp(servico.telefone);

  const jaNaEquipe = new Set(
    servico.equipe.map((membro) => membro.funcionarioId).filter(Boolean),
  );

  const produtosDisponiveis: ProdutoDisponivel[] = produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    unidade: ROTULO_UNIDADE[produto.unidade],
    saldo: formatarNumero(produto.saldoAtual),
    custoMedio: formatarMoeda(produto.custoMedio),
    semSaldo: produto.saldoAtual.lte(0),
  }));

  const funcionariosDisponiveis: FuncionarioDisponivel[] = funcionarios
    .filter((funcionario) => !jaNaEquipe.has(funcionario.id))
    .map((funcionario) => ({
      id: funcionario.id,
      nome: funcionario.nome,
      funcao: funcionario.funcao,
      tipoPadrao: funcionario.tipoPadrao,
      salarioMensal: funcionario.salarioMensal?.toFixed(2).replace(".", ",") ?? "",
      valorDiariaPadrao:
        funcionario.valorDiariaPadrao?.toFixed(2).replace(".", ",") ?? "",
      percentualComissaoPadrao:
        funcionario.percentualComissaoPadrao?.toString() ?? "",
    }));

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/servicos"
        className="flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para serviços
      </Link>

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-texto-fraco">#{servico.numero}</span>
            {servico.cliente}
            <Etiqueta
              tom={
                servico.status === "CONCLUIDO"
                  ? "positivo"
                  : servico.status === "CANCELADO"
                    ? "neutro"
                    : "marca"
              }
            >
              {ROTULO_STATUS_SERVICO[servico.status]}
            </Etiqueta>
          </span>
        }
        descricao={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {servico.veiculo}
              {servico.placa && ` · ${servico.placa}`}
            </span>
            <span>
              {formatarData(servico.dataInicio)}
              {servico.dataConclusao
                ? ` — ${formatarData(servico.dataConclusao)}`
                : " — em aberto"}{" "}
              ({diasCorridos(servico.dataInicio, servico.dataConclusao)} dias)
            </span>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-marca-clara"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                {formatarTelefone(servico.telefone)}
              </a>
            )}
          </span>
        }
        acao={
          servico.status !== "CONCLUIDO" ? (
            <form action={mudarStatus}>
              <input type="hidden" name="servicoId" value={servico.id} />
              <input type="hidden" name="status" value="CONCLUIDO" />
              <button type="submit" className={estiloBotao("secundario", "pequeno")}>
                Marcar como concluído
              </button>
            </form>
          ) : (
            <form action={mudarStatus}>
              <input type="hidden" name="servicoId" value={servico.id} />
              <input type="hidden" name="status" value="EM_ANDAMENTO" />
              <button type="submit" className={estiloBotao("secundario", "pequeno")}>
                Reabrir serviço
              </button>
            </form>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Orçado" valor={formatarMoeda(resumo.valorOrcado)} />
        <Indicador
          rotulo="Custo total"
          valor={formatarMoeda(resumo.custoTotal)}
          tom="alerta"
        />
        <Indicador
          rotulo="Margem"
          valor={formatarMoeda(resumo.margem)}
          tom={resumo.margem.gte(0) ? "positivo" : "negativo"}
          detalhe={
            resumo.margemPercentual
              ? `${resumo.margemPercentual.toString()}% do orçado`
              : "Sem valor orçado"
          }
        />
        <Indicador
          rotulo="Dias lançados"
          valor={resumo.totalDiasTrabalhados}
          detalhe="Somando toda a equipe"
        />
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-borda bg-superficie/40 p-1">
        {ABAS.map((item) => (
          <Link
            key={item.valor}
            href={`/servicos/${servico.id}?aba=${item.valor}`}
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

      {aba === "resumo" && (
        <>
          <Cartao>
            <CartaoCabecalho
              titulo="Fechamento"
              descricao="De onde vem cada real do custo deste serviço."
            />
            <Tabela>
              <Cabecalho>
                <tr>
                  <Th>Componente</Th>
                  <Th numerico>Valor</Th>
                  <Th numerico>% do orçado</Th>
                </tr>
              </Cabecalho>
              <Corpo>
                {[
                  {
                    rotulo: "Produtos do estoque",
                    valor: resumo.custoProdutos,
                    href: "produtos",
                  },
                  { rotulo: "Gastos avulsos", valor: resumo.custoGastos, href: "gastos" },
                  {
                    rotulo: "Mão de obra",
                    valor: resumo.custoMaoDeObra,
                    href: "equipe",
                  },
                ].map((linha) => (
                  <Linha key={linha.rotulo}>
                    <Td>
                      <Link
                        href={`/servicos/${servico.id}?aba=${linha.href}`}
                        className="text-texto hover:text-marca-clara"
                      >
                        {linha.rotulo}
                      </Link>
                    </Td>
                    <Td numerico>{formatarMoeda(linha.valor)}</Td>
                    <Td numerico className="text-texto-fraco">
                      {resumo.valorOrcado.gt(0)
                        ? `${linha.valor.div(resumo.valorOrcado).mul(100).toFixed(1)}%`
                        : "—"}
                    </Td>
                  </Linha>
                ))}
                <Linha className="font-medium">
                  <Td>Custo total</Td>
                  <Td numerico>{formatarMoeda(resumo.custoTotal)}</Td>
                  <Td numerico className="text-texto-fraco">
                    {resumo.valorOrcado.gt(0)
                      ? `${resumo.custoTotal.div(resumo.valorOrcado).mul(100).toFixed(1)}%`
                      : "—"}
                  </Td>
                </Linha>
                <Linha className="font-medium">
                  <Td>Margem</Td>
                  <Td numerico>
                    <span
                      className={
                        resumo.margem.gte(0) ? "text-sucesso" : "text-erro"
                      }
                    >
                      {formatarMoeda(resumo.margem)}
                    </span>
                  </Td>
                  <Td numerico className="text-texto-fraco">
                    {resumo.margemPercentual
                      ? `${resumo.margemPercentual.toString()}%`
                      : "—"}
                  </Td>
                </Linha>
              </Corpo>
            </Tabela>
          </Cartao>

          {(servico.descricao ?? servico.observacao) && (
            <Cartao>
              <CartaoCabecalho titulo="Descrição e observações" />
              <CartaoCorpo className="flex flex-col gap-3 text-sm text-texto-suave">
                {servico.descricao && (
                  <p className="whitespace-pre-line">{servico.descricao}</p>
                )}
                {servico.observacao && (
                  <p className="border-t border-borda pt-3 whitespace-pre-line text-texto-fraco">
                    {servico.observacao}
                  </p>
                )}
              </CartaoCorpo>
            </Cartao>
          )}

          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg border border-borda bg-superficie/40 px-4 py-3 text-sm font-medium text-texto-suave hover:text-texto">
              Editar dados do serviço
            </summary>
            <Cartao className="mt-3">
              <CartaoCorpo>
                <FormularioServico
                  hoje={hoje}
                  servico={{
                    id: servico.id,
                    cliente: servico.cliente,
                    telefone: servico.telefone,
                    veiculo: servico.veiculo,
                    placa: servico.placa,
                    descricao: servico.descricao,
                    valorOrcado: servico.valorOrcado.toFixed(2).replace(".", ","),
                    status: servico.status,
                    dataInicio: paraCampoData(servico.dataInicio),
                    dataConclusao: servico.dataConclusao
                      ? paraCampoData(servico.dataConclusao)
                      : "",
                    observacao: servico.observacao,
                  }}
                />
              </CartaoCorpo>
            </Cartao>
          </details>
        </>
      )}

      {aba === "produtos" && (
        <>
          <Cartao>
            <CartaoCabecalho
              titulo="Retirar produto do estoque"
              descricao="A quantidade sai do estoque e o custo entra neste serviço."
            />
            <CartaoCorpo>
              <FormularioProdutoNoServico
                servicoId={servico.id}
                produtos={produtosDisponiveis}
                hoje={hoje}
              />
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho
              titulo="Produtos usados"
              descricao={`${formatarMoeda(resumo.custoProdutos)} em produtos.`}
            />
            {servico.movimentos.length === 0 ? (
              <Vazio
                titulo="Nenhum produto lançado"
                descricao="Retire acima o que já foi usado neste serviço."
              />
            ) : (
              <Tabela>
                <Cabecalho>
                  <tr>
                    <Th>Data</Th>
                    <Th>Produto</Th>
                    <Th numerico>Qtd.</Th>
                    <Th numerico>Custo unit.</Th>
                    <Th numerico>Total</Th>
                    <Th />
                  </tr>
                </Cabecalho>
                <Corpo>
                  {servico.movimentos.map((movimento) => (
                    <Linha key={movimento.id}>
                      <Td className="whitespace-nowrap text-texto-fraco">
                        {formatarData(movimento.data)}
                      </Td>
                      <Td>
                        <Link
                          href={`/produtos/${movimento.produto.id}`}
                          className="font-medium text-texto hover:text-marca-clara"
                        >
                          {movimento.produto.nome}
                        </Link>
                        {movimento.observacao && (
                          <span className="mt-0.5 block text-xs text-texto-fraco">
                            {movimento.observacao}
                          </span>
                        )}
                      </Td>
                      <Td numerico>
                        {formatarNumero(movimento.quantidade)}{" "}
                        <span className="text-xs text-texto-fraco">
                          {ROTULO_UNIDADE[movimento.produto.unidade]}
                        </span>
                      </Td>
                      <Td numerico className="text-texto-fraco">
                        {formatarMoeda(movimento.custoUnitario)}
                      </Td>
                      <Td numerico>{formatarMoeda(movimento.custoTotal)}</Td>
                      <Td className="w-10">
                        <form action={estornarProdutoDoServico}>
                          <input
                            type="hidden"
                            name="movimentoId"
                            value={movimento.id}
                          />
                          <input type="hidden" name="servicoId" value={servico.id} />
                          <button
                            type="submit"
                            aria-label={`Devolver ${movimento.produto.nome} ao estoque`}
                            title="Devolver ao estoque"
                            className="rounded p-1.5 text-texto-fraco hover:bg-erro/10 hover:text-erro"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </form>
                      </Td>
                    </Linha>
                  ))}
                </Corpo>
              </Tabela>
            )}
          </Cartao>
        </>
      )}

      {aba === "gastos" && (
        <>
          <Cartao>
            <CartaoCabecalho
              titulo="Lançar gasto"
              descricao="Despesas que não saem do estoque: terceirizados, combustível, ferramenta."
            />
            <CartaoCorpo>
              <FormularioGasto servicoId={servico.id} hoje={hoje} />
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho
              titulo="Gastos lançados"
              descricao={`${formatarMoeda(resumo.custoGastos)} em gastos avulsos.`}
            />
            {servico.gastos.length === 0 ? (
              <Vazio titulo="Nenhum gasto lançado" />
            ) : (
              <Tabela>
                <Cabecalho>
                  <tr>
                    <Th>Data</Th>
                    <Th>Descrição</Th>
                    <Th>Categoria</Th>
                    <Th numerico>Valor</Th>
                    <Th />
                  </tr>
                </Cabecalho>
                <Corpo>
                  {servico.gastos.map((gasto) => (
                    <Linha key={gasto.id}>
                      <Td className="whitespace-nowrap text-texto-fraco">
                        {formatarData(gasto.data)}
                      </Td>
                      <Td className="font-medium">{gasto.descricao}</Td>
                      <Td>
                        <Etiqueta>
                          {ROTULO_CATEGORIA_GASTO[gasto.categoria]}
                        </Etiqueta>
                      </Td>
                      <Td numerico>{formatarMoeda(gasto.valor)}</Td>
                      <Td className="w-10">
                        <form action={removerGasto}>
                          <input type="hidden" name="gastoId" value={gasto.id} />
                          <input type="hidden" name="servicoId" value={servico.id} />
                          <button
                            type="submit"
                            aria-label={`Remover gasto ${gasto.descricao}`}
                            className="rounded p-1.5 text-texto-fraco hover:bg-erro/10 hover:text-erro"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </form>
                      </Td>
                    </Linha>
                  ))}
                </Corpo>
              </Tabela>
            )}
          </Cartao>
        </>
      )}

      {aba === "equipe" && (
        <>
          <Cartao>
            <CartaoCabecalho
              titulo="Vincular funcionário"
              descricao="Os valores do cadastro são copiados e ficam congelados neste serviço."
            />
            <CartaoCorpo>
              <FormularioAlocacao
                servicoId={servico.id}
                funcionarios={funcionariosDisponiveis}
              />
            </CartaoCorpo>
          </Cartao>

          {servico.equipe.length === 0 ? (
            <Cartao>
              <Vazio
                titulo="Ninguém vinculado ainda"
                descricao="Vincule quem trabalhou neste serviço para a mão de obra entrar no custo."
              />
            </Cartao>
          ) : (
            servico.equipe.map((membro) => {
              const dias = membro.dias.map((dia) => dia.data);
              const custo = custoDaAlocacao({
                alocacao: {
                  tipoRemuneracao: membro.tipoRemuneracao,
                  salarioMensal: membro.salarioMensal,
                  valorDiaria: membro.valorDiaria,
                  percentualComissao: membro.percentualComissao,
                },
                dias,
                valorOrcado: servico.valorOrcado,
              });

              return (
                <Cartao key={membro.id}>
                  <CartaoCabecalho
                    titulo={
                      <span className="flex flex-wrap items-center gap-2">
                        {membro.nome}
                        <Etiqueta tom="marca">
                          {ROTULO_REMUNERACAO[membro.tipoRemuneracao]}
                        </Etiqueta>
                      </span>
                    }
                    descricao={explicarCalculo({
                      alocacao: {
                        tipoRemuneracao: membro.tipoRemuneracao,
                        salarioMensal: membro.salarioMensal,
                        valorDiaria: membro.valorDiaria,
                        percentualComissao: membro.percentualComissao,
                      },
                      dias,
                    })}
                    acao={
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular text-texto">
                            {formatarMoeda(custo.custo)}
                          </p>
                          {custo.valorMedioDia && (
                            <p className="text-xs text-texto-fraco">
                              {formatarMoeda(custo.valorMedioDia)} por dia
                            </p>
                          )}
                        </div>
                        <form action={removerAlocacao}>
                          <input
                            type="hidden"
                            name="alocacaoId"
                            value={membro.id}
                          />
                          <input type="hidden" name="servicoId" value={servico.id} />
                          <button
                            type="submit"
                            aria-label={`Remover ${membro.nome} do serviço`}
                            className="rounded p-1.5 text-texto-fraco hover:bg-erro/10 hover:text-erro"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </form>
                      </div>
                    }
                  />

                  <CartaoCorpo className="flex flex-col gap-4">
                    {membro.tipoRemuneracao !== "COMISSAO" && (
                      <FormularioDias
                        servicoId={servico.id}
                        alocacaoId={membro.id}
                        hoje={hoje}
                      />
                    )}

                    {membro.dias.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 border-t border-borda pt-3">
                        {membro.dias.map((dia) => (
                          <form
                            key={dia.id}
                            action={removerDia}
                            className="inline-flex"
                          >
                            <input type="hidden" name="diaId" value={dia.id} />
                            <input
                              type="hidden"
                              name="servicoId"
                              value={servico.id}
                            />
                            <button
                              type="submit"
                              title="Remover este dia"
                              className="inline-flex items-center gap-1 rounded-full border border-borda bg-superficie px-2.5 py-1 text-xs tabular text-texto-suave hover:border-erro/50 hover:text-erro"
                            >
                              {formatarData(dia.data)}
                              <X className="size-3" aria-hidden />
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : membro.tipoRemuneracao !== "COMISSAO" ? (
                      <p className="border-t border-borda pt-3 text-sm text-texto-fraco">
                        Nenhum dia lançado — sem dias, o custo desta pessoa é zero.
                      </p>
                    ) : null}
                  </CartaoCorpo>
                </Cartao>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
