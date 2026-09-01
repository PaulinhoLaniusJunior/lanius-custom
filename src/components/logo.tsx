import Image from "next/image";

import { cn } from "@/lib/utils";

export const EMPRESA = {
  nome: "Lanius Custom",
  ramo: "Pintura, reforma & lanternagem de caminhões",
  telefone: "(66) 99988-7155",
  instagram: "@Laniuscustom",
} as const;

/** Logo completa, para o login e para o cabecalho dos relatorios impressos. */
export function LogoCompleta({
  className,
  largura = 320,
  prioridade = false,
}: {
  className?: string;
  largura?: number;
  prioridade?: boolean;
}) {
  return (
    <Image
      src="/logo.jpeg"
      alt="Lanius Custom"
      width={largura}
      height={Math.round((largura * 900) / 1600)}
      priority={prioridade}
      className={cn("h-auto w-full max-w-full rounded-lg", className)}
    />
  );
}

/** Marca compacta para a barra de navegacao: simbolo + nome. */
export function MarcaCompacta({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/icon-192.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-md"
      />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-wide text-texto">
          LANIUS
        </span>
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-marca">
          Custom
        </span>
      </span>
    </span>
  );
}
