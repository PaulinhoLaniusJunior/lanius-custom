import Image from "next/image";

import { EMPRESA } from "@/components/logo";

/**
 * Cabeçalho dos relatórios impressos.
 *
 * Só aparece no papel (`so-impressao`): na tela o contexto já está na
 * navegação, mas a folha que chega ao fornecedor precisa se identificar
 * sozinha.
 */
export function CabecalhoImpressao({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <header className="so-impressao mb-4 border-b border-black pb-3">
      <div className="flex items-start justify-between gap-6">
        <Image
          src="/logo.jpeg"
          alt="Lanius Custom"
          width={260}
          height={146}
          className="h-auto w-52"
        />

        <div className="text-right text-[10pt] leading-snug">
          <p className="text-[13pt] font-semibold">{EMPRESA.nome}</p>
          <p>{EMPRESA.ramo}</p>
          <p>
            {EMPRESA.telefone} · {EMPRESA.instagram}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <h1 className="text-[14pt] font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-[10pt]">{subtitulo}</p>}
      </div>
    </header>
  );
}
