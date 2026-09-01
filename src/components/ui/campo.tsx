import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const CONTROLE =
  "w-full min-h-11 rounded-lg border border-borda bg-fundo px-3 py-2 text-texto " +
  "placeholder:text-texto-fraco transition-colors " +
  "focus:border-marca focus:outline-none focus:ring-1 focus:ring-marca " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

type CampoProps = {
  label: string;
  /** Texto de apoio abaixo do campo, para explicar a regra sem poluir o rotulo. */
  ajuda?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
};

/** Rotulo + controle + ajuda/erro, o formato usado em todos os formularios. */
export function Campo({
  label,
  ajuda,
  erro,
  obrigatorio,
  children,
  className,
}: CampoProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-texto-suave">
        {label}
        {obrigatorio && <span className="ml-1 text-marca">*</span>}
      </span>
      {children}
      {erro ? (
        <span className="text-xs text-erro">{erro}</span>
      ) : ajuda ? (
        <span className="text-xs text-texto-fraco">{ajuda}</span>
      ) : null}
    </label>
  );
}

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROLE, className)} {...props} />;
}

/**
 * Campo de valor em reais ou quantidade.
 * `inputMode="decimal"` abre o teclado numerico no celular, e o texto livre
 * aceita tanto "1.234,56" quanto "1234.56" — a conversao acontece no servidor.
 */
export function EntradaNumero({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn(CONTROLE, "tabular", className)}
      {...props}
    />
  );
}

export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(CONTROLE, "appearance-none bg-fundo pr-8", className)}
      {...props}
    />
  );
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      className={cn(CONTROLE, "min-h-20 resize-y", className)}
      {...props}
    />
  );
}

/** Linha de formulario que vira coluna unica no celular. */
export function LinhaFormulario({
  children,
  colunas = 2,
  className,
}: {
  children: ReactNode;
  colunas?: 2 | 3 | 4;
  className?: string;
}) {
  const grade = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[colunas];

  return (
    <div className={cn("grid grid-cols-1 gap-4", grade, className)}>
      {children}
    </div>
  );
}
