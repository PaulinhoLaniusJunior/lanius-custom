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
import { ESTADO_INICIAL } from "@/lib/actions/tipos";
import {
  adicionarGasto,
  alocarFuncionario,
  lancarDias,
  lancarProdutoNoServico,
} from "@/lib/actions/servicos";
import { CATEGORIAS_GASTO, TIPOS_REMUNERACAO } from "@/lib/rotulos";

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export type ProdutoDisponivel = {
  id: string;
  nome: string;
  unidade: string;
  saldo: string;
  custoMedio: string;
  /** `true` quando o saldo é zero — não dá para lançar. */
  semSaldo: boolean;
};

/** Retira produto do estoque para o serviço, mostrando o saldo antes. */
export function FormularioProdutoNoServico({
  servicoId,
  produtos,
  hoje,
}: {
  servicoId: string;
  produtos: ProdutoDisponivel[];
  hoje: string;
}) {
  const [estado, acao] = useActionState(lancarProdutoNoServico, ESTADO_INICIAL);
  const [produtoId, setProdutoId] = useState("");

  const escolhido = produtos.find((produto) => produto.id === produtoId);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="servicoId" value={servicoId} />

      <Campo
        label="Produto"
        obrigatorio
        erro={estado.campos?.produtoId}
        ajuda={
          escolhido
            ? `Disponível: ${escolhido.saldo} ${escolhido.unidade} · custo médio ${escolhido.custoMedio}`
            : "O custo é calculado pelo custo médio do produto no momento da baixa."
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
            <option key={produto.id} value={produto.id} disabled={produto.semSaldo}>
              {produto.nome} — {produto.saldo} {produto.unidade}
              {produto.semSaldo ? " (sem saldo)" : ""}
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

        <Campo label="Data" obrigatorio erro={estado.campos?.data}>
          <Entrada name="data" type="date" defaultValue={hoje} required />
        </Campo>

        <Campo label="Observação" erro={estado.campos?.observacao}>
          <Entrada
            name="observacao"
            placeholder="Ex.: 2ª demão"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Lançando...">Retirar do estoque</BotaoEnvio>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Gastos
// ---------------------------------------------------------------------------

export function FormularioGasto({
  servicoId,
  hoje,
}: {
  servicoId: string;
  hoje: string;
}) {
  const [estado, acao] = useActionState(adicionarGasto, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="servicoId" value={servicoId} />

      <Campo label="Descrição" obrigatorio erro={estado.campos?.descricao}>
        <Entrada
          name="descricao"
          placeholder="Ex.: retífica do cabeçote"
          autoComplete="off"
          required
        />
      </Campo>

      <LinhaFormulario colunas={3}>
        <Campo label="Categoria" obrigatorio erro={estado.campos?.categoria}>
          <Selecao name="categoria" defaultValue="OUTRO">
            {CATEGORIAS_GASTO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo label="Valor" obrigatorio erro={estado.campos?.valor}>
          <EntradaNumero name="valor" placeholder="0,00" required />
        </Campo>

        <Campo label="Data" obrigatorio erro={estado.campos?.data}>
          <Entrada name="data" type="date" defaultValue={hoje} required />
        </Campo>
      </LinhaFormulario>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Lançando...">Lançar gasto</BotaoEnvio>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------

export type FuncionarioDisponivel = {
  id: string;
  nome: string;
  funcao: string | null;
  tipoPadrao: string;
  salarioMensal: string;
  valorDiariaPadrao: string;
  percentualComissaoPadrao: string;
};

/**
 * Vincula um funcionário ao serviço.
 *
 * Ao escolher a pessoa, os valores do cadastro são copiados para os campos —
 * dá para ajustar só neste serviço sem mexer no cadastro dela.
 */
export function FormularioAlocacao({
  servicoId,
  funcionarios,
}: {
  servicoId: string;
  funcionarios: FuncionarioDisponivel[];
}) {
  const [estado, acao] = useActionState(alocarFuncionario, ESTADO_INICIAL);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [tipo, setTipo] = useState("SALARIO");
  const [salario, setSalario] = useState("");
  const [diaria, setDiaria] = useState("");
  const [comissao, setComissao] = useState("");

  function aoEscolher(id: string) {
    setFuncionarioId(id);
    const escolhido = funcionarios.find((funcionario) => funcionario.id === id);
    if (!escolhido) return;

    setTipo(escolhido.tipoPadrao);
    setSalario(escolhido.salarioMensal);
    setDiaria(escolhido.valorDiariaPadrao);
    setComissao(escolhido.percentualComissaoPadrao);
  }

  if (funcionarios.length === 0) {
    return (
      <p className="text-sm text-texto-fraco">
        Todos os funcionários cadastrados já estão neste serviço.
      </p>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="servicoId" value={servicoId} />

      <LinhaFormulario>
        <Campo label="Funcionário" obrigatorio erro={estado.campos?.funcionarioId}>
          <Selecao
            name="funcionarioId"
            value={funcionarioId}
            onChange={(evento) => aoEscolher(evento.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {funcionarios.map((funcionario) => (
              <option key={funcionario.id} value={funcionario.id}>
                {funcionario.nome}
                {funcionario.funcao ? ` — ${funcionario.funcao}` : ""}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo
          label="Remuneração neste serviço"
          obrigatorio
          erro={estado.campos?.tipoRemuneracao}
          ajuda="O valor fica congelado aqui, mesmo que o cadastro mude depois."
        >
          <Selecao
            name="tipoRemuneracao"
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
      </LinhaFormulario>

      <LinhaFormulario colunas={3}>
        <Campo
          label="Salário mensal"
          obrigatorio={tipo === "SALARIO"}
          erro={estado.campos?.salarioMensal}
          className={tipo === "SALARIO" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="salarioMensal"
            value={salario}
            onChange={(evento) => setSalario(evento.target.value)}
            placeholder="0,00"
          />
        </Campo>

        <Campo
          label="Valor da diária"
          obrigatorio={tipo === "DIARIA"}
          erro={estado.campos?.valorDiaria}
          className={tipo === "DIARIA" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="valorDiaria"
            value={diaria}
            onChange={(evento) => setDiaria(evento.target.value)}
            placeholder="0,00"
          />
        </Campo>

        <Campo
          label="Comissão (%)"
          obrigatorio={tipo === "COMISSAO"}
          erro={estado.campos?.percentualComissao}
          className={tipo === "COMISSAO" ? "" : "opacity-60"}
        >
          <EntradaNumero
            name="percentualComissao"
            value={comissao}
            onChange={(evento) => setComissao(evento.target.value)}
            placeholder="0"
          />
        </Campo>
      </LinhaFormulario>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Vinculando...">Vincular ao serviço</BotaoEnvio>
      </div>
    </form>
  );
}

/**
 * Lança dias trabalhados de uma pessoa.
 *
 * Aceita um período inteiro: um serviço costuma ocupar a pessoa por vários
 * dias seguidos, e marcar um a um seria trabalhoso demais.
 */
export function FormularioDias({
  servicoId,
  alocacaoId,
  hoje,
}: {
  servicoId: string;
  alocacaoId: string;
  hoje: string;
}) {
  const [estado, acao] = useActionState(lancarDias, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="servicoId" value={servicoId} />
      <input type="hidden" name="alocacaoId" value={alocacaoId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo label="De" obrigatorio erro={estado.campos?.de}>
          <Entrada name="de" type="date" defaultValue={hoje} required />
        </Campo>

        <Campo
          label="Até"
          erro={estado.campos?.ate}
          ajuda="Em branco lança só o dia inicial."
        >
          <Entrada name="ate" type="date" />
        </Campo>

        <BotaoEnvio variante="secundario" carregando="Lançando...">
          Lançar dias
        </BotaoEnvio>
      </div>

      <label className="flex items-center gap-2 text-sm text-texto-suave">
        <input
          type="checkbox"
          name="incluirFimDeSemana"
          className="size-4 accent-marca"
        />
        Incluir sábados e domingos
      </label>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
