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
import { criarProduto, editarProduto } from "@/lib/actions/produtos";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";
import { UNIDADES } from "@/lib/rotulos";

type Produto = {
  id: string;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  descricao: string | null;
  unidade: string;
  estoqueMinimo: string;
};

export function FormularioProduto({ produto }: { produto?: Produto }) {
  const [estado, acao] = useActionState(
    produto ? editarProduto : criarProduto,
    ESTADO_INICIAL,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      {produto && <input type="hidden" name="id" value={produto.id} />}

      <Campo label="Nome do produto" obrigatorio erro={estado.campos?.nome}>
        <Entrada
          name="nome"
          defaultValue={produto?.nome}
          placeholder="Ex.: Tinta PU branca"
          autoComplete="off"
          required
          autoFocus={!produto}
        />
      </Campo>

      <LinhaFormulario colunas={3}>
        <Campo
          label="Unidade"
          obrigatorio
          erro={estado.campos?.unidade}
          ajuda="Como você compra e consome este produto."
        >
          <Selecao name="unidade" defaultValue={produto?.unidade ?? "UN"}>
            {UNIDADES.map((unidade) => (
              <option key={unidade.valor} value={unidade.valor}>
                {unidade.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo label="Código" erro={estado.campos?.codigo} ajuda="Opcional.">
          <Entrada
            name="codigo"
            defaultValue={produto?.codigo ?? ""}
            placeholder="Ex.: TIN-001"
            autoComplete="off"
          />
        </Campo>

        <Campo label="Categoria" erro={estado.campos?.categoria} ajuda="Opcional.">
          <Entrada
            name="categoria"
            defaultValue={produto?.categoria ?? ""}
            placeholder="Ex.: Tintas"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      <Campo
        label="Estoque mínimo"
        erro={estado.campos?.estoqueMinimo}
        ajuda="Abaixo disso o produto aparece no alerta do painel. Deixe 0 para não avisar."
        className="sm:max-w-xs"
      >
        <EntradaNumero
          name="estoqueMinimo"
          defaultValue={produto?.estoqueMinimo ?? "0"}
          placeholder="0"
        />
      </Campo>

      <Campo label="Observações" erro={estado.campos?.descricao}>
        <AreaTexto
          name="descricao"
          defaultValue={produto?.descricao ?? ""}
          placeholder="Marca, cor, referência do fabricante..."
        />
      </Campo>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Salvando...">
          {produto ? "Salvar alterações" : "Cadastrar produto"}
        </BotaoEnvio>
      </div>
    </form>
  );
}
