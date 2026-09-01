import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FormularioFornecedor } from "@/app/(app)/fornecedores/formulario-fornecedor";
import { CabecalhoPagina, Cartao, CartaoCorpo } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default function NovoFornecedor() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/fornecedores"
        className="flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para fornecedores
      </Link>

      <CabecalhoPagina
        titulo="Novo fornecedor"
        descricao="Depois de cadastrar, informe os preços dele para cada produto."
      />

      <Cartao className="max-w-2xl">
        <CartaoCorpo>
          <FormularioFornecedor />
        </CartaoCorpo>
      </Cartao>
    </div>
  );
}
