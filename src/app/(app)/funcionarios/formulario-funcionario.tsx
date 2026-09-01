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
import {
  criarFuncionario,
  editarFuncionario,
} from "@/lib/actions/funcionarios";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";
import { TIPOS_REMUNERACAO } from "@/lib/rotulos";

export type FuncionarioForm = {
  id: string;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  tipoPadrao: string;
  salarioMensal: string;
  valorDiariaPadrao: string;
  percentualComissaoPadrao: string;
};

export function FormularioFuncionario({
  funcionario,
}: {
  funcionario?: FuncionarioForm;
}) {
  const [estado, acao] = useActionState(
    funcionario ? editarFuncionario : criarFuncionario,
    ESTADO_INICIAL,
  );
  const [tipo, setTipo] = useState(funcionario?.tipoPadrao ?? "SALARIO");

  return (
    <form action={acao} className="flex flex-col gap-4">
      {funcionario && <input type="hidden" name="id" value={funcionario.id} />}

      <LinhaFormulario colunas={3}>
        <Campo label="Nome" obrigatorio erro={estado.campos?.nome}>
          <Entrada
            name="nome"
            defaultValue={funcionario?.nome}
            placeholder="Ex.: Carlos Pereira"
            autoComplete="off"
            required
          />
        </Campo>

        <Campo label="Função" erro={estado.campos?.funcao}>
          <Entrada
            name="funcao"
            defaultValue={funcionario?.funcao ?? ""}
            placeholder="Ex.: Pintor"
            autoComplete="off"
          />
        </Campo>

        <Campo label="Telefone" erro={estado.campos?.telefone}>
          <Entrada
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={funcionario?.telefone ?? ""}
            placeholder="(66) 99999-0000"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      <Campo
        label="Como ele é remunerado"
        obrigatorio
        erro={estado.campos?.tipoPadrao}
        ajuda="Ao vincular a um serviço, o sistema já traz esta forma preenchida — e você pode mudar só naquele serviço."
      >
        <Selecao
          name="tipoPadrao"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value)}
        >
          {TIPOS_REMUNERACAO.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </Selecao>
      </Campo>

      <LinhaFormulario colunas={3}>
        {/* Todos os campos são enviados; só o exigido pela forma escolhida
            aparece em destaque, para não esconder valor já cadastrado. */}
        <Campo
          label="Salário mensal"
          obrigatorio={tipo === "SALARIO"}
          erro={estado.campos?.salarioMensal}
          ajuda={
            tipo === "SALARIO"
              ? "O dia trabalhado sai daqui dividido pelos dias úteis do mês."
              : undefined
          }
          className={tipo === "SALARIO" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="salarioMensal"
            defaultValue={funcionario?.salarioMensal ?? ""}
            placeholder="0,00"
          />
        </Campo>

        <Campo
          label="Valor da diária"
          obrigatorio={tipo === "DIARIA"}
          erro={estado.campos?.valorDiariaPadrao}
          className={tipo === "DIARIA" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="valorDiariaPadrao"
            defaultValue={funcionario?.valorDiariaPadrao ?? ""}
            placeholder="0,00"
          />
        </Campo>

        <Campo
          label="Comissão (%)"
          obrigatorio={tipo === "COMISSAO"}
          erro={estado.campos?.percentualComissaoPadrao}
          ajuda={
            tipo === "COMISSAO" ? "Percentual sobre o valor orçado." : undefined
          }
          className={tipo === "COMISSAO" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="percentualComissaoPadrao"
            defaultValue={funcionario?.percentualComissaoPadrao ?? ""}
            placeholder="0"
          />
        </Campo>
      </LinhaFormulario>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Salvando...">
          {funcionario ? "Salvar alterações" : "Cadastrar funcionário"}
        </BotaoEnvio>
      </div>
    </form>
  );
}
