"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";

import { BotaoEnvio } from "@/components/botao-envio";
import { AreaTexto, Campo, Entrada, LinhaFormulario } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { criarCotacao, editarCotacao } from "@/lib/actions/cotacoes";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

export function FormularioNovaCotacao({
  produtosEmFalta,
}: {
  produtosEmFalta: number;
}) {
  const [estado, acao] = useActionState(criarCotacao, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <LinhaFormulario>
        <Campo label="Título" ajuda="Opcional. Ex.: “Compra de setembro”.">
          <Entrada
            name="titulo"
            placeholder="Compra de setembro"
            autoComplete="off"
          />
        </Campo>

        <Campo label="Observação" ajuda="Aparece no relatório enviado ao fornecedor.">
          <Entrada
            name="observacao"
            placeholder="Ex.: entrega até sexta"
            autoComplete="off"
          />
        </Campo>
      </LinhaFormulario>

      {produtosEmFalta > 0 && (
        <label className="flex items-start gap-2.5 rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm text-texto-suave">
          <input
            type="checkbox"
            name="repor"
            value="1"
            defaultChecked
            className="mt-0.5 size-4 shrink-0 accent-marca"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium text-alerta">
              <AlertTriangle className="size-4" aria-hidden />
              Já preencher com os {produtosEmFalta} produto(s) abaixo do mínimo
            </span>
            <span className="mt-0.5 block text-xs text-texto-fraco">
              A quantidade sugerida é o que falta para cada um voltar ao estoque mínimo.
              Você ainda pode ajustar tudo depois.
            </span>
          </span>
        </label>
      )}

      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Criando...">Criar cotação</BotaoEnvio>
      </div>
    </form>
  );
}

export function FormularioEditarCotacao({
  cotacao,
}: {
  cotacao: { id: string; titulo: string | null; observacao: string | null };
}) {
  const [estado, acao] = useActionState(editarCotacao, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={cotacao.id} />

      <Campo label="Título">
        <Entrada
          name="titulo"
          defaultValue={cotacao.titulo ?? ""}
          placeholder="Compra de setembro"
          autoComplete="off"
        />
      </Campo>

      <Campo label="Observação" ajuda="Aparece no relatório enviado ao fornecedor.">
        <AreaTexto
          name="observacao"
          defaultValue={cotacao.observacao ?? ""}
          placeholder="Ex.: entrega até sexta, pagamento em 30 dias"
        />
      </Campo>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tom="sucesso">{estado.sucesso}</Aviso>}

      <div className="flex justify-end">
        <BotaoEnvio carregando="Salvando...">Salvar</BotaoEnvio>
      </div>
    </form>
  );
}
