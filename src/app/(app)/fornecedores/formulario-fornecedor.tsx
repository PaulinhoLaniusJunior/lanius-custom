"use client";

import { useActionState } from "react";

import { BotaoEnvio } from "@/components/botao-envio";
import {
  AreaTexto,
  Campo,
  Entrada,
  LinhaFormulario,
} from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { criarFornecedor, editarFornecedor } from "@/lib/actions/fornecedores";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

type Fornecedor = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  observacao: string | null;
};

export function FormularioFornecedor({
  fornecedor,
}: {
  fornecedor?: Fornecedor;
}) {
  const [estado, acao] = useActionState(
    fornecedor ? editarFornecedor : criarFornecedor,
    ESTADO_INICIAL,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}

      <Campo label="Nome" obrigatorio erro={estado.campos?.nome}>
        <Entrada
          name="nome"
          defaultValue={fornecedor?.nome}
          placeholder="Ex.: Casa da Tinta"
          autoComplete="off"
          required
          autoFocus={!fornecedor}
        />
      </Campo>

      <LinhaFormulario>
        <Campo
          label="Telefone"
          erro={estado.campos?.telefone}
          ajuda="Vira link do WhatsApp na tela do fornecedor."
        >
          <Entrada
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={fornecedor?.telefone ?? ""}
            placeholder="(66) 99999-0000"
            autoComplete="off"
          />
        </Campo>

        <Campo label="Cidade" erro={estado.campos?.cidade}>
          <Entrada
            name="cidade"
            defaultValue={fornecedor?.cidade ?? ""}
            placeholder="Ex.: Sinop"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      <Campo label="Observações" erro={estado.campos?.observacao}>
        <AreaTexto
          name="observacao"
          defaultValue={fornecedor?.observacao ?? ""}
          placeholder="Prazo de entrega, condição de pagamento, vendedor de contato..."
        />
      </Campo>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Salvando...">
          {fornecedor ? "Salvar alterações" : "Cadastrar fornecedor"}
        </BotaoEnvio>
      </div>
    </form>
  );
}
