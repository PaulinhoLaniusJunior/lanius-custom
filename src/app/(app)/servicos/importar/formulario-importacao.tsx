"use client";

import { startTransition, useActionState, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

import { Botao } from "@/components/ui/botao";
import {
  Aviso,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Indicador,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { analisarPlanilha, importarPlanilha } from "@/lib/actions/importacao";
import { ESTADO_IMPORTACAO } from "@/lib/actions/importacao-tipos";
import type { ProblemaPlanilha } from "@/lib/planilha/leitor";

/** Onde o problema está, em uma frase curta. */
function localizacao(problema: ProblemaPlanilha) {
  const partes = [problema.aba];
  if (problema.linha) partes.push(`linha ${problema.linha}`);
  if (problema.coluna) partes.push(`coluna ${problema.coluna}`);
  return partes.join(" · ");
}

function ListaDeProblemas({
  problemas,
  tom,
}: {
  problemas: ProblemaPlanilha[];
  tom: "erro" | "alerta";
}) {
  return (
    <ul className="flex flex-col divide-y divide-borda/60">
      {problemas.map((problema, indice) => (
        <li key={indice} className="flex flex-col gap-0.5 px-4 py-2.5">
          <span
            className={`text-xs font-medium ${tom === "erro" ? "text-erro" : "text-alerta"}`}
          >
            {localizacao(problema)}
          </span>
          <span className="text-sm text-texto-suave">{problema.mensagem}</span>
        </li>
      ))}
    </ul>
  );
}

export function FormularioImportacao() {
  const [conferencia, conferir, conferindo] = useActionState(
    analisarPlanilha,
    ESTADO_IMPORTACAO,
  );
  const [gravacao, gravar, gravando] = useActionState(
    importarPlanilha,
    ESTADO_IMPORTACAO,
  );

  // O arquivo fica em estado, não no campo: o React limpa os campos do
  // formulário assim que uma ação termina, e a confirmação precisa reenviar
  // exatamente o mesmo arquivo que foi conferido.
  const [arquivo, setArquivo] = useState<File | null>(null);

  const previa = conferencia.previa;
  const erro = gravacao.erro ?? conferencia.erro;
  const problemas = gravacao.problemas ?? conferencia.problemas;
  const ocupado = conferindo || gravando;

  /** Manda o arquivo para a ação escolhida, sem depender do envio do formulário. */
  function enviar(acao: (dados: FormData) => void) {
    if (!arquivo) return;
    const dados = new FormData();
    dados.set("planilha", arquivo);
    startTransition(() => acao(dados));
  }

  return (
    <div className="flex flex-col gap-5">
      <Cartao>
        <CartaoCabecalho
          titulo="1. Enviar a planilha preenchida"
          descricao="Nada é gravado neste passo — você confere antes de confirmar."
        />
        <CartaoCorpo className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-borda-forte bg-fundo px-4 py-8 text-center transition-colors hover:border-marca">
            <FileSpreadsheet className="size-8 text-texto-fraco" aria-hidden />
            <span className="font-medium text-texto">
              {arquivo?.name ?? "Escolher planilha .xlsx"}
            </span>
            <span className="text-xs text-texto-fraco">
              Toque para procurar o arquivo no aparelho
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(evento) => setArquivo(evento.target.files?.[0] ?? null)}
            />
          </label>

          {erro && <Aviso>{erro}</Aviso>}

          <div className="flex flex-wrap justify-end gap-2">
            {arquivo && (
              <Botao
                variante="secundario"
                disabled={ocupado}
                onClick={() => setArquivo(null)}
              >
                Trocar arquivo
              </Botao>
            )}
            <Botao
              disabled={!arquivo || ocupado}
              onClick={() => enviar(conferir)}
            >
              {conferindo ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {conferindo ? "Conferindo..." : "Conferir planilha"}
            </Botao>
          </div>
        </CartaoCorpo>
      </Cartao>

      {problemas && problemas.length > 0 && (
        <Cartao className="border-erro/40">
          <CartaoCabecalho
            titulo={
              <span className="flex items-center gap-2 text-erro">
                <AlertTriangle className="size-4" aria-hidden />
                {problemas.length} ponto(s) para corrigir
              </span>
            }
            descricao="Nada foi gravado. Corrija a planilha e envie de novo."
          />
          <ListaDeProblemas problemas={problemas} tom="erro" />
        </Cartao>
      )}

      {conferencia.avisos && conferencia.avisos.length > 0 && (
        <Cartao className="border-alerta/40">
          <CartaoCabecalho
            titulo={
              <span className="flex items-center gap-2 text-alerta">
                <AlertTriangle className="size-4" aria-hidden />
                Vale conferir
              </span>
            }
            descricao="São avisos: não impedem a importação."
          />
          <ListaDeProblemas problemas={conferencia.avisos} tom="alerta" />
        </Cartao>
      )}

      {previa && (
        <>
          <Cartao className="border-sucesso/40">
            <CartaoCabecalho
              titulo={
                <span className="flex items-center gap-2 text-sucesso">
                  <CheckCircle2 className="size-4" aria-hidden />
                  2. Conferir o que será importado
                </span>
              }
              descricao="Compare os números com a sua planilha antes de confirmar."
            />

            <CartaoCorpo>
              <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                {[
                  ["Cliente", previa.servico.cliente],
                  [
                    "Veículo",
                    [previa.servico.veiculo, previa.servico.placa]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  ["Situação", previa.servico.situacao],
                  ["Valor orçado", previa.servico.valorOrcado],
                  ["Início", previa.servico.dataInicio],
                  ["Conclusão", previa.servico.dataConclusao ?? "Em aberto"],
                ].map(([rotulo, valor]) => (
                  <div
                    key={rotulo}
                    className="flex justify-between gap-4 border-b border-borda/60 py-1.5"
                  >
                    <dt className="text-texto-fraco">{rotulo}</dt>
                    <dd className="text-right font-medium text-texto">{valor}</dd>
                  </div>
                ))}
              </dl>
            </CartaoCorpo>

            <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:px-5 lg:grid-cols-4">
              <Indicador rotulo="Produtos" valor={previa.totais.produtos} />
              <Indicador rotulo="Gastos" valor={previa.totais.gastos} />
              <Indicador rotulo="Mão de obra" valor={previa.totais.maoDeObra} />
              <Indicador
                rotulo="Margem prevista"
                valor={previa.totais.margem}
                tom={previa.totais.margemNegativa ? "negativo" : "positivo"}
                detalhe={`Custo ${previa.totais.custoTotal}`}
              />
            </div>
          </Cartao>

          <Cartao>
            <CartaoCabecalho
              titulo={`Produtos (${previa.produtos.length})`}
              descricao={
                previa.produtosNovos > 0
                  ? `${previa.produtosNovos} produto(s) serão cadastrados agora.`
                  : "Todos já estão no cadastro."
              }
            />
            <Tabela>
              <Cabecalho>
                <tr>
                  <Th>Produto</Th>
                  <Th numerico>Qtd.</Th>
                  <Th numerico>Preço unit.</Th>
                  <Th numerico>Total</Th>
                </tr>
              </Cabecalho>
              <Corpo>
                {previa.produtos.map((item) => (
                  <Linha key={item.linha}>
                    <Td>
                      <span className="font-medium text-texto">{item.produto}</span>
                      {item.novo && (
                        <Etiqueta tom="info" className="ml-2">
                          Novo
                        </Etiqueta>
                      )}
                    </Td>
                    <Td numerico>
                      {item.quantidade}{" "}
                      <span className="text-xs text-texto-fraco">{item.unidade}</span>
                    </Td>
                    <Td numerico>{item.precoUnitario}</Td>
                    <Td numerico>{item.custoTotal}</Td>
                  </Linha>
                ))}
              </Corpo>
            </Tabela>
          </Cartao>

          {previa.gastos.length > 0 && (
            <Cartao>
              <CartaoCabecalho titulo={`Gastos (${previa.gastos.length})`} />
              <Tabela>
                <Cabecalho>
                  <tr>
                    <Th>Descrição</Th>
                    <Th>Categoria</Th>
                    <Th numerico>Valor</Th>
                  </tr>
                </Cabecalho>
                <Corpo>
                  {previa.gastos.map((item, indice) => (
                    <Linha key={indice}>
                      <Td className="font-medium">{item.descricao}</Td>
                      <Td>
                        <Etiqueta>{item.categoria}</Etiqueta>
                      </Td>
                      <Td numerico>{item.valor}</Td>
                    </Linha>
                  ))}
                </Corpo>
              </Tabela>
            </Cartao>
          )}

          {previa.equipe.length > 0 && (
            <Cartao>
              <CartaoCabecalho
                titulo={`Equipe (${previa.equipe.length})`}
                descricao={
                  previa.funcionariosNovos > 0
                    ? `${previa.funcionariosNovos} funcionário(s) serão cadastrados agora.`
                    : undefined
                }
              />
              <Tabela>
                <Cabecalho>
                  <tr>
                    <Th>Funcionário</Th>
                    <Th>Remuneração</Th>
                    <Th numerico>Dias</Th>
                  </tr>
                </Cabecalho>
                <Corpo>
                  {previa.equipe.map((membro, indice) => (
                    <Linha key={indice}>
                      <Td>
                        <span className="font-medium text-texto">{membro.nome}</span>
                        {membro.novo && (
                          <Etiqueta tom="info" className="ml-2">
                            Novo
                          </Etiqueta>
                        )}
                      </Td>
                      <Td>
                        <Etiqueta tom="marca">{membro.remuneracao}</Etiqueta>
                      </Td>
                      <Td numerico>{membro.dias}</Td>
                    </Linha>
                  ))}
                </Corpo>
              </Tabela>
            </Cartao>
          )}

          <Cartao className="border-marca/40">
            <CartaoCorpo className="flex flex-col gap-4">
              <p className="text-sm text-texto-suave">
                Ao confirmar, o serviço é criado com os produtos, gastos e dias acima. O
                saldo e o custo médio dos produtos <strong>não mudam</strong>: a entrada
                e a saída são lançadas juntas, apenas para o histórico.
              </p>

              <div className="flex justify-end">
                <Botao
                  tamanho="grande"
                  disabled={!arquivo || ocupado}
                  onClick={() => enviar(gravar)}
                >
                  {gravando && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  {gravando ? "Importando..." : "Confirmar importação"}
                </Botao>
              </div>
            </CartaoCorpo>
          </Cartao>
        </>
      )}
    </div>
  );
}
