import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Tabelas rolam dentro do proprio quadro no celular; a pagina nunca rola
 * na horizontal.
 */
export function Tabela({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full min-w-[36rem] border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function Cabecalho({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "border-b border-borda text-left text-xs uppercase tracking-wide text-texto-fraco",
        className,
      )}
      {...props}
    />
  );
}

export function Corpo({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody className={cn("divide-y divide-borda/60", className)} {...props} />
  );
}

export function Linha({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr className={cn("transition-colors hover:bg-superficie/70", className)} {...props} />
  );
}

export function Th({
  className,
  numerico,
  ...props
}: ComponentProps<"th"> & { numerico?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-medium",
        numerico && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  numerico,
  ...props
}: ComponentProps<"td"> & { numerico?: boolean }) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle",
        numerico && "text-right tabular",
        className,
      )}
      {...props}
    />
  );
}
