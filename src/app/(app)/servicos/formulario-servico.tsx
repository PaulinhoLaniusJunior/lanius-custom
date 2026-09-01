"use client";

import { useActionState } from "react";

import { BotaoEnvio } from "@/components/botao-envio";
import {
  AreaTexto,
  Campo,
  Entrada,
  EntradaNumero,
  LinhaFormulario,
  Selecao,
} from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { criarServico, editarServico } from "@/lib/actions/servicos";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";
import { STATUS_SERVICO } from "@/lib/rotulos";

export type ServicoForm = {
  id: string;
  cliente: string;
  telefone: string | null;
  veiculo: string;
  placa: string | null;
  descricao: string | null;
  valorOrcado: string;
  status: string;
  dataInicio: string;
  dataConclusao: string;
  observacao: string | null;
};

export function FormularioServico({
  servico,
  hoje,
}: {
  servico?: ServicoForm;
  hoje: string;
}) {
  const [estado, acao] = useActionState(
    servico ? editarServico : criarServico,
    ESTADO_INICIAL,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      {servico && <input type="hidden" name="id" value={servico.id} />}

      <LinhaFormulario>
        <Campo label="Cliente" obrigatorio erro={estado.campos?.cliente}>
          <Entrada
            name="cliente"
            defaultValue={servico?.cliente}
            placeholder="Ex.: Transportes Silva"
            autoComplete="off"
            required
            autoFocus={!servico}
          />
        </Campo>

        <Campo label="Telefone" erro={estado.campos?.telefone}>
          <Entrada
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={servico?.telefone ?? ""}
            placeholder="(66) 99999-0000"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      <LinhaFormulario colunas={3}>
        <Campo label="Veículo" obrigatorio erro={estado.campos?.veiculo}>
          <Entrada
            name="veiculo"
            defaultValue={servico?.veiculo}
            placeholder="Ex.: Scania R450 2019"
            autoComplete="off"
            required
          />
        </Campo>

        <Campo label="Placa" erro={estado.campos?.placa}>
          <Entrada
            name="placa"
            defaultValue={servico?.placa ?? ""}
            placeholder="ABC1D23"
            autoComplete="off"
            className="uppercase"
          />
        </Campo>

        <Campo
          label="Valor orçado"
          erro={estado.campos?.valorOrcado}
          ajuda="O que foi combinado com o cliente."
        >
          <EntradaNumero
            name="valorOrcado"
            defaultValue={servico?.valorOrcado ?? ""}
            placeholder="0,00"
          />
        </Campo>
      </LinhaFormulario>

      <LinhaFormulario colunas={3}>
        <Campo label="Situação" obrigatorio erro={estado.campos?.status}>
          <Selecao name="status" defaultValue={servico?.status ?? "EM_ANDAMENTO"}>
            {STATUS_SERVICO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo label="Início" obrigatorio erro={estado.campos?.dataInicio}>
          <Entrada
            name="dataInicio"
            type="date"
            defaultValue={servico?.dataInicio ?? hoje}
            required
          />
        </Campo>

        <Campo
          label="Conclusão"
          erro={estado.campos?.dataConclusao}
          ajuda="Deixe em branco enquanto o serviço estiver aberto."
        >
          <Entrada
            name="dataConclusao"
            type="date"
            defaultValue={servico?.dataConclusao ?? ""}
          />
        </Campo>
      </LinhaFormulario>

      <Campo label="Descrição do serviço" erro={estado.campos?.descricao}>
        <AreaTexto
          name="descricao"
          defaultValue={servico?.descricao ?? ""}
          placeholder="Ex.: pintura completa da cabine, reparo na porta esquerda..."
        />
      </Campo>

      <Campo label="Observações" erro={estado.campos?.observacao}>
        <AreaTexto
          name="observacao"
          defaultValue={servico?.observacao ?? ""}
          placeholder="Combinados com o cliente, prazo, forma de pagamento..."
        />
      </Campo>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Salvando...">
          {servico ? "Salvar alterações" : "Cadastrar serviço"}
        </BotaoEnvio>
      </div>
    </form>
  );
}
