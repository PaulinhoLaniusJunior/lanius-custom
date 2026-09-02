import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { BotaoLink } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  Etiqueta,
  Indicador,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { dec } from "@/lib/decimal";
import { diasCorridos } from "@/lib/domain/servico";
import { formatarData, formatarMoeda } from "@/lib/format";
import { listarServicosComResumo } from "@/lib/queries/servicos";
import { ROTULO_STATUS_SERVICO } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Serviços" };

const TOM_STATUS = {
  ORCAMENTO: "info",
  EM_ANDAMENTO: "marca",
  CONCLUIDO: "positivo",
  CANCELADO: "neutro",
} as const;

export default async function ListaServicos(props: PageProps<"/servicos">) {
  const { situacao } = await props.searchParams;
  const filtro = typeof situacao === "string" ? situacao : "abertos";

  const servicos = await listarServicosComResumo({
    status:
      filtro === "todos"
        ? undefined
        : filtro === "concluidos"
          ? ["CONCLUIDO"]
          : ["ORCAMENTO", "EM_ANDAMENTO"],
  });

  const totalOrcado = servicos.reduce(
    (soma, servico) => soma.plus(servico.resumo.valorOrcado),
    dec(0),
  );
  const totalCusto = servicos.reduce(
    (soma, servico) => soma.plus(servico.resumo.custoTotal),
    dec(0),
  );
  const totalMargem = totalOrcado.minus(totalCusto);

  const abas = [
    { valor: "abertos", rotulo: "Abertos" },
    { valor: "concluidos", rotulo: "Concluídos" },
    { valor: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Serviços"
        descricao="O que entrou na oficina e quanto cada um está custando."
        acao={
          <div className="flex gap-2">
            <BotaoLink href="/servicos/importar" variante="secundario">
              <Upload className="size-4" aria-hidden />
              Importar planilha
            </BotaoLink>
            <BotaoLink href="/servicos/novo">
              <Plus className="size-4" aria-hidden />
              Serviço
            </BotaoLink>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Indicador rotulo="Orçado" valor={formatarMoeda(totalOrcado)} />
        <Indicador
          rotulo="Custo"
          valor={formatarMoeda(totalCusto)}
          tom="alerta"
        />
        <Indicador
          rotulo="Margem"
          valor={formatarMoeda(totalMargem)}
          tom={totalMargem.gte(0) ? "positivo" : "negativo"}
        />
      </div>

      <nav className="flex gap-1 rounded-lg border border-borda bg-superficie/40 p-1">
        {abas.map((aba) => (
          <Link
            key={aba.valor}
            href={`/servicos?situacao=${aba.valor}`}
            aria-current={filtro === aba.valor ? "page" : undefined}
            className={
              filtro === aba.valor
                ? "flex-1 rounded-md bg-marca/15 px-3 py-2 text-center text-sm font-medium text-texto"
                : "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-texto-fraco hover:text-texto"
            }
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>

      <Cartao>
        {servicos.length === 0 ? (
          <Vazio
            titulo="Nenhum serviço nesta situação"
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
                <Th>Situação</Th>
                <Th numerico>Orçado</Th>
                <Th numerico>Custo</Th>
                <Th numerico>Margem</Th>
                <Th numerico>Dias</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {servicos.map((servico) => (
                <Linha key={servico.id}>
                  <Td>
                    <Link
                      href={`/servicos/${servico.id}`}
                      className="font-medium text-texto hover:text-marca-clara"
                    >
                      #{servico.numero} {servico.cliente}
                    </Link>
                    <span className="mt-0.5 block text-xs text-texto-fraco">
                      {formatarData(servico.dataInicio)}
                      {servico.dataConclusao &&
                        ` — ${formatarData(servico.dataConclusao)}`}
                    </span>
                  </Td>
                  <Td className="text-texto-suave">
                    {servico.veiculo}
                    {servico.placa && (
                      <span className="mt-0.5 block text-xs text-texto-fraco">
                        {servico.placa}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Etiqueta tom={TOM_STATUS[servico.status]}>
                      {ROTULO_STATUS_SERVICO[servico.status]}
                    </Etiqueta>
                  </Td>
                  <Td numerico>{formatarMoeda(servico.resumo.valorOrcado)}</Td>
                  <Td numerico className="text-texto-suave">
                    {formatarMoeda(servico.resumo.custoTotal)}
                  </Td>
                  <Td numerico>
                    <span
                      className={
                        servico.resumo.margem.gte(0) ? "text-sucesso" : "text-erro"
                      }
                    >
                      {formatarMoeda(servico.resumo.margem)}
                    </span>
                    {servico.resumo.margemPercentual && (
                      <span className="mt-0.5 block text-xs text-texto-fraco">
                        {servico.resumo.margemPercentual.toString()}%
                      </span>
                    )}
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
    </div>
  );
}
