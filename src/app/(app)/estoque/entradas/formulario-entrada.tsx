"use client";

import { useActionState, useState } from "react";

import { BotaoEnvio } from "@/components/botao-envio";
import {
  Campo,
  Entrada,
  EntradaNumero,
  LinhaFormulario,
  Selecao,
} from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { lancarEntrada } from "@/lib/actions/produtos";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  saldoAtual: string;
  custoMedio: string;
};

type Fornecedor = { id: string; nome: string };

/**
 * Lançamento de entrada a partir da lista completa de produtos.
 * Mostra o saldo e o custo médio atuais do produto escolhido para conferência
 * antes de gravar.
 */
export function FormularioEntrada({
  produtos,
  fornecedores,
  hoje,
  produtoInicial,
}: {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  hoje: string;
  produtoInicial?: string;
}) {
  const [estado, acao] = useActionState(lancarEntrada, ESTADO_INICIAL);
  const [produtoId, setProdutoId] = useState(produtoInicial ?? "");

  const escolhido = produtos.find((produto) => produto.id === produtoId);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo
        label="Produto"
        obrigatorio
        erro={estado.campos?.produtoId}
        ajuda={
          escolhido
            ? `Saldo atual: ${escolhido.saldoAtual} ${escolhido.unidade} · custo médio ${escolhido.custoMedio}`
            : "Escolha o produto que está entrando."
        }
      >
        <Selecao
          name="produtoId"
          value={produtoId}
          onChange={(evento) => setProdutoId(evento.target.value)}
          required
        >
          <option value="">Selecione...</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome} ({produto.unidade})
            </option>
          ))}
        </Selecao>
      </Campo>

      <LinhaFormulario colunas={3}>
        <Campo
          label={escolhido ? `Quantidade (${escolhido.unidade})` : "Quantidade"}
          obrigatorio
          erro={estado.campos?.quantidade}
        >
          <EntradaNumero name="quantidade" placeholder="0" required />
        </Campo>

        <Campo
          label="Preço unitário"
          obrigatorio
          erro={estado.campos?.precoUnitario}
          ajuda="Quanto você pagou por unidade."
        >
          <EntradaNumero name="precoUnitario" placeholder="0,00" required />
        </Campo>

        <Campo label="Data" obrigatorio erro={estado.campos?.data}>
          <Entrada name="data" type="date" defaultValue={hoje} required />
        </Campo>
      </LinhaFormulario>

      <LinhaFormulario>
        <Campo label="Fornecedor" ajuda="Opcional.">
          <Selecao name="fornecedorId" defaultValue="">
            <option value="">Não informar</option>
            {fornecedores.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo label="Nota / documento" ajuda="Opcional.">
          <Entrada name="documento" placeholder="Ex.: NF 1234" autoComplete="off" />
        </Campo>
      </LinhaFormulario>

      <label className="flex items-start gap-2.5 text-sm text-texto-suave">
        <input
          type="checkbox"
          name="atualizarPrecoFornecedor"
          defaultChecked
          className="mt-0.5 size-4 shrink-0 accent-marca"
        />
        <span>
          Atualizar o preço deste produto na tabela do fornecedor
          <span className="block text-xs text-texto-fraco">
            Mantém a comparação de melhores preços em dia com o que você pagou de verdade.
          </span>
        </span>
      </label>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio tamanho="grande" carregando="Lançando...">
          Lançar entrada
        </BotaoEnvio>
      </div>
    </form>
  );
}
