import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Cartao({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-borda bg-superficie/60 backdrop-blur-[1px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CartaoCabecalho({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-borda px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-texto">{titulo}</h2>
        {descricao && (
          <p className="mt-0.5 text-sm text-texto-fraco">{descricao}</p>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}

export function CartaoCorpo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

/** Titulo de pagina com acao a direita. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-texto sm:text-2xl">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1 text-sm text-texto-fraco">{descricao}</p>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}

/** Numero grande com rotulo, usado nos cartoes do painel e no resumo do servico. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  className,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "neutro" | "positivo" | "negativo" | "alerta" | "marca";
  className?: string;
}) {
  const cor = {
    neutro: "text-texto",
    positivo: "text-sucesso",
    negativo: "text-erro",
    alerta: "text-alerta",
    marca: "text-marca-clara",
  }[tom];

  return (
    <div
      className={cn(
        "rounded-xl border border-borda bg-superficie/60 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-texto-fraco">
        {rotulo}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular sm:text-2xl", cor)}>
        {valor}
      </p>
      {detalhe && <p className="mt-0.5 text-xs text-texto-fraco">{detalhe}</p>}
    </div>
  );
}

export function Etiqueta({
  children,
  tom = "neutro",
  className,
}: {
  children: ReactNode;
  tom?: "neutro" | "positivo" | "negativo" | "alerta" | "info" | "marca";
  className?: string;
}) {
  const estilo = {
    neutro: "bg-borda/50 text-texto-suave",
    positivo: "bg-sucesso/15 text-sucesso",
    negativo: "bg-erro/15 text-erro",
    alerta: "bg-alerta/15 text-alerta",
    info: "bg-info/15 text-info",
    marca: "bg-marca/15 text-marca-clara",
  }[tom];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        estilo,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Estado vazio: diz o que fazer em vez de mostrar uma lista em branco. */
export function Vazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="font-medium text-texto-suave">{titulo}</p>
      {descricao && (
        <p className="max-w-sm text-sm text-texto-fraco">{descricao}</p>
      )}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

export function Aviso({
  children,
  tom = "erro",
  className,
}: {
  children: ReactNode;
  tom?: "erro" | "alerta" | "info" | "sucesso";
  className?: string;
}) {
  const estilo = {
    erro: "border-erro/40 bg-erro/10 text-erro",
    alerta: "border-alerta/40 bg-alerta/10 text-alerta",
    info: "border-info/40 bg-info/10 text-info",
    sucesso: "border-sucesso/40 bg-sucesso/10 text-sucesso",
  }[tom];

  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        estilo,
        className,
      )}
      role={tom === "erro" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}
