import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variante = "principal" | "secundario" | "fantasma" | "perigo";
type Tamanho = "pequeno" | "medio" | "grande";

const VARIANTES: Record<Variante, string> = {
  principal:
    "bg-marca text-white hover:bg-marca-clara active:bg-marca-escura shadow-sm shadow-marca/30",
  secundario:
    "bg-superficie text-texto border border-borda-forte hover:border-prata/50 hover:bg-superficie/70",
  fantasma: "text-texto-suave hover:text-texto hover:bg-superficie",
  perigo:
    "bg-transparent text-erro border border-erro/40 hover:bg-erro/10 hover:border-erro",
};

const TAMANHOS: Record<Tamanho, string> = {
  // Altura minima de 40px para o toque no celular nao errar o alvo.
  pequeno: "min-h-10 px-3 text-sm gap-1.5",
  medio: "min-h-11 px-4 text-sm gap-2",
  grande: "min-h-12 px-6 text-base gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

export function estiloBotao(
  variante: Variante = "principal",
  tamanho: Tamanho = "medio",
  classe?: string,
) {
  return cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], classe);
}

type BotaoProps = ComponentProps<"button"> & {
  variante?: Variante;
  tamanho?: Tamanho;
};

export function Botao({
  variante = "principal",
  tamanho = "medio",
  className,
  type = "button",
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      className={estiloBotao(variante, tamanho, className)}
      {...props}
    />
  );
}

type BotaoLinkProps = ComponentProps<typeof Link> & {
  variante?: Variante;
  tamanho?: Tamanho;
  children: ReactNode;
};

export function BotaoLink({
  variante = "principal",
  tamanho = "medio",
  className,
  ...props
}: BotaoLinkProps) {
  return (
    <Link className={estiloBotao(variante, tamanho, className)} {...props} />
  );
}
