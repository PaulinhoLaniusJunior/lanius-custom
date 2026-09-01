"use client";

import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { BotaoEnvio } from "@/components/botao-envio";
import { Entrada, EntradaNumero } from "@/components/ui/campo";
import { Aviso, Etiqueta, Vazio } from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { salvarPrecos } from "@/lib/actions/fornecedores";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

export type LinhaPreco = {
  produtoId: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  /** Preço atual deste fornecedor, em texto pronto para o campo. */
  preco: string;
  atualizadoEm: string | null;
  /** Menor preço entre todos os fornecedores, para comparação. */
  melhorPreco: string | null;
  ehOMaisBarato: boolean;
};

/**
 * Tabela de preços do fornecedor, salva de uma vez só.
 *
 * O trabalho real é receber uma lista do fornecedor e digitar tudo de uma vez,
 * então um botão único no fim evita dezenas de idas ao servidor.
 */
export function TabelaPrecos({
  fornecedorId,
  linhas,
}: {
  fornecedorId: string;
  linhas: LinhaPreco[];
}) {
  const [estado, acao] = useActionState(salvarPrecos, ESTADO_INICIAL);
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter(
      (linha) =>
        linha.nome.toLowerCase().includes(termo) ||
        linha.categoria?.toLowerCase().includes(termo),
    );
  }, [busca, linhas]);

  if (linhas.length === 0) {
    return (
      <Vazio
        titulo="Nenhum produto cadastrado"
        descricao="Cadastre produtos no estoque para poder registrar os preços deste fornecedor."
      />
    );
  }

  return (
    <form action={acao}>
      <input type="hidden" name="fornecedorId" value={fornecedorId} />

      <div className="relative border-b border-borda p-3">
        <Search
          className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 text-texto-fraco"
          aria-hidden
        />
        <Entrada
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Filtrar produtos"
          className="pl-9"
          aria-label="Filtrar produtos"
        />
      </div>

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum produto encontrado" descricao="Tente outro termo." />
      ) : (
        <Tabela>
          <Cabecalho>
            <tr>
              <Th>Produto</Th>
              <Th numerico>Melhor preço hoje</Th>
              <Th numerico className="w-40">
                Preço deste fornecedor
              </Th>
            </tr>
          </Cabecalho>
          <Corpo>
            {visiveis.map((linha) => (
              <Linha key={linha.produtoId}>
                <Td>
                  <span className="font-medium text-texto">{linha.nome}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-texto-fraco">
                    <span>{linha.unidade}</span>
                    {linha.categoria && <span>· {linha.categoria}</span>}
                    {linha.atualizadoEm && (
                      <span>· atualizado em {linha.atualizadoEm}</span>
                    )}
                  </span>
                </Td>
                <Td numerico>
                  {linha.melhorPreco ? (
                    <span className="flex items-center justify-end gap-2">
                      <span className="text-texto-suave">{linha.melhorPreco}</span>
                      {linha.ehOMaisBarato && (
                        <Etiqueta tom="positivo">Você</Etiqueta>
                      )}
                    </span>
                  ) : (
                    <span className="text-texto-fraco">—</span>
                  )}
                </Td>
                <Td numerico>
                  <EntradaNumero
                    name={`preco_${linha.produtoId}`}
                    defaultValue={linha.preco}
                    placeholder="—"
                    aria-label={`Preço de ${linha.nome}`}
                    className="text-right"
                  />
                  {estado.campos?.[`preco_${linha.produtoId}`] && (
                    <span className="mt-1 block text-xs text-erro">
                      {estado.campos[`preco_${linha.produtoId}`]}
                    </span>
                  )}
                </Td>
              </Linha>
            ))}
          </Corpo>
        </Tabela>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda p-3">
        <p className="text-xs text-texto-fraco">
          Deixe em branco para dizer que o fornecedor não trabalha com o produto.
        </p>
        <div className="flex items-center gap-3">
          {estado.erro && <Aviso className="py-1">{estado.erro}</Aviso>}
          {estado.sucesso && (
            <Aviso tom="sucesso" className="py-1">
              {estado.sucesso}
            </Aviso>
          )}
          <BotaoEnvio carregando="Salvando...">Salvar preços</BotaoEnvio>
        </div>
      </div>
    </form>
  );
}
