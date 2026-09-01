"use client";

import { useActionState } from "react";

import { BotaoEnvio } from "@/components/botao-envio";
import { Campo, Entrada } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/layout";
import { entrar } from "@/lib/actions/auth";
import { ESTADO_INICIAL } from "@/lib/actions/tipos";

export function FormularioLogin() {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo label="E-mail" obrigatorio>
        <Entrada
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          required
        />
      </Campo>

      <Campo label="Senha" obrigatorio>
        <Entrada
          name="senha"
          type="password"
          autoComplete="current-password"
          required
        />
      </Campo>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <BotaoEnvio tamanho="grande" carregando="Entrando..." className="mt-2">
        Entrar
      </BotaoEnvio>
    </form>
  );
}
