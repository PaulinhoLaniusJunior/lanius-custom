"use client";

import { useActionState } from "react";

import { BotaoEnvio } from "@/components/botao-envio";
import {
  Campo,
  Entrada,
  EntradaNumero,
  LinhaFormulario,
  Selecao,
} from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { ajustarSaldo, lancarEntrada } from "@/lib/actions/produtos";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

type Fornecedor = { id: string; nome: string };

/** Entrada de mercadoria direto na tela do produto. */
export function FormularioEntradaRapida({
  produtoId,
  unidade,
  fornecedores,
  hoje,
}: {
  produtoId: string;
  unidade: string;
  fornecedores: Fornecedor[];
  hoje: string;
}) {
  const [estado, acao] = useActionState(lancarEntrada, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="produtoId" value={produtoId} />

      <LinhaFormulario colunas={3}>
        <Campo
          label={`Quantidade (${unidade})`}
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
        <BotaoEnvio carregando="Lançando...">Lançar entrada</BotaoEnvio>
      </div>
    </form>
  );
}

/** Acerta o saldo do sistema pelo que foi contado na prateleira. */
export function FormularioAjuste({
  produtoId,
  unidade,
  saldoAtual,
}: {
  produtoId: string;
  unidade: string;
  saldoAtual: string;
}) {
  const [estado, acao] = useActionState(ajustarSaldo, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="produtoId" value={produtoId} />

      <LinhaFormulario>
        <Campo
          label={`Saldo contado (${unidade})`}
          obrigatorio
          erro={estado.campos?.saldoContado}
          ajuda={`O sistema tem ${saldoAtual} ${unidade}.`}
        >
          <EntradaNumero name="saldoContado" placeholder="0" required />
        </Campo>

        <Campo label="Motivo" ajuda="Opcional.">
          <Entrada
            name="observacao"
            placeholder="Ex.: contagem de inventário"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio variante="secundario" carregando="Ajustando...">
          Ajustar saldo
        </BotaoEnvio>
      </div>
    </form>
  );
}
