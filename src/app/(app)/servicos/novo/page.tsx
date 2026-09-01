import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FormularioServico } from "@/app/(app)/servicos/formulario-servico";
import { CabecalhoPagina, Cartao, CartaoCorpo } from "@/components/ui/layout";
import { hojeCampoData } from "@/lib/format";

export const metadata: Metadata = { title: "Novo serviço" };

export default function NovoServico() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/servicos"
        className="flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para serviços
      </Link>

      <CabecalhoPagina
        titulo="Novo serviço"
        descricao="Cadastro rápido. Os produtos, gastos e dias são lançados depois, na tela do serviço."
      />

      <Cartao className="max-w-4xl">
        <CartaoCorpo>
          <FormularioServico hoje={hojeCampoData()} />
        </CartaoCorpo>
      </Cartao>
    </div>
  );
}
