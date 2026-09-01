"use client";

import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { BotaoEnvio } from "@/components/botao-envio";
import { Entrada, EntradaNumero } from "@/components/ui/campo";
import { Aviso, Etiqueta, Vazio } from "@/components/ui/layout";
import { salvarItens } from "@/lib/actions/cotacoes";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

export type LinhaItem = {
  produtoId: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  /** Quantidade já na cotação, em texto pronto para o campo. */
  quantidade: string;
  saldo: string;
  abaixoDoMinimo: boolean;
  sugestao: string | null;
};

/**
 * Montagem da cotação: percorra o catálogo e digite o que precisa comprar.
 * Salva tudo de uma vez, como a tabela de preços do fornecedor.
 */
export function MontarItens({
  cotacaoId,
  linhas,
}: {
  cotacaoId: string;
  linhas: LinhaItem[];
}) {
  const [estado, acao] = useActionState(salvarItens, ESTADO_INICIAL);
  const [busca, setBusca] = useState("");
  const [soFaltantes, setSoFaltantes] = useState(false);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((linha) => {
      if (soFaltantes && !linha.abaixoDoMinimo && linha.quantidade === "") {
        return false;
      }
      if (!termo) return true;
      return (
        linha.nome.toLowerCase().includes(termo) ||
        linha.categoria?.toLowerCase().includes(termo)
      );
    });
  }, [busca, linhas, soFaltantes]);

  if (linhas.length === 0) {
    return (
      <Vazio
        titulo="Nenhum produto cadastrado"
        descricao="Cadastre produtos no estoque para poder montar uma cotação."
      />
    );
  }

  return (
    <form action={acao}>
      <input type="hidden" name="cotacaoId" value={cotacaoId} />

      <div className="flex flex-col gap-3 border-b border-borda p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-fraco"
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
        <label className="flex items-center gap-2 text-sm whitespace-nowrap text-texto-suave">
          <input
            type="checkbox"
            checked={soFaltantes}
            onChange={(evento) => setSoFaltantes(evento.target.checked)}
            className="size-4 accent-marca"
          />
          Só o que falta
        </label>
      </div>

      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum produto encontrado" descricao="Tente outro filtro." />
      ) : (
        <ul className="divide-y divide-borda/60">
          {visiveis.map((linha) => (
            <li
              key={linha.produtoId}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-texto">
                  {linha.nome}
                  {linha.abaixoDoMinimo && (
                    <Etiqueta tom="alerta">Abaixo do mínimo</Etiqueta>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-texto-fraco">
                  Em estoque: {linha.saldo} {linha.unidade}
                  {linha.categoria && ` · ${linha.categoria}`}
                  {linha.sugestao && ` · falta ${linha.sugestao}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="w-28">
                  <EntradaNumero
                    name={`qtd_${linha.produtoId}`}
                    defaultValue={linha.quantidade}
                    placeholder="—"
                    aria-label={`Quantidade de ${linha.nome}`}
                    className="text-right"
                  />
                </div>
                <span className="w-8 text-sm text-texto-fraco">
                  {linha.unidade}
                </span>
              </div>

              {estado.campos?.[`qtd_${linha.produtoId}`] && (
                <p className="w-full text-xs text-erro">
                  {estado.campos[`qtd_${linha.produtoId}`]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda p-3">
        <p className="text-xs text-texto-fraco">
          Deixe em branco (ou zero) para tirar o produto da cotação.
        </p>
        <div className="flex items-center gap-3">
          {estado.erro && <Aviso className="py-1">{estado.erro}</Aviso>}
          {estado.sucesso && (
            <Aviso tom="sucesso" className="py-1">
              {estado.sucesso}
            </Aviso>
          )}
          <BotaoEnvio carregando="Salvando...">Salvar itens</BotaoEnvio>
        </div>
      </div>
    </form>
  );
}
