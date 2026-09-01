"use client";

import { Printer } from "lucide-react";

import { Botao } from "@/components/ui/botao";

/**
 * Abre a caixa de impressão do navegador.
 * No celular, a mesma caixa oferece "Salvar como PDF" — que é como o
 * relatório vai parar no WhatsApp do fornecedor.
 */
export function BotaoImprimir({
  children = "Imprimir",
  variante = "principal",
}: {
  children?: React.ReactNode;
  variante?: "principal" | "secundario";
}) {
  return (
    <Botao
      variante={variante}
      onClick={() => window.print()}
      className="nao-imprimir"
    >
      <Printer className="size-4" aria-hidden />
      {children}
    </Botao>
  );
}
