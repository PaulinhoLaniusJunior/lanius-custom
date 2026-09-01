"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Botao } from "@/components/ui/botao";

type Props = Omit<ComponentProps<typeof Botao>, "type"> & {
  /** Texto exibido enquanto a acao esta em andamento. */
  carregando?: string;
};

/**
 * Botao de envio que se desabilita sozinho durante a submissao — evita o
 * clique duplo que lancaria a mesma baixa de estoque duas vezes.
 */
export function BotaoEnvio({
  children,
  carregando,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Botao type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && carregando ? carregando : children}
    </Botao>
  );
}
