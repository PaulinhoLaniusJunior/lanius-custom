import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FormularioProduto } from "@/app/(app)/produtos/formulario-produto";
import { CabecalhoPagina, Cartao, CartaoCorpo } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Novo produto" };

export default function NovoProduto() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/produtos"
        className="flex w-fit items-center gap-1.5 text-sm text-texto-suave hover:text-marca-clara"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar para o estoque
      </Link>

      <CabecalhoPagina
        titulo="Novo produto"
        descricao="O saldo começa em zero. Depois de cadastrar, lance a primeira entrada."
      />

      <Cartao className="max-w-3xl">
        <CartaoCorpo>
          <FormularioProduto />
        </CartaoCorpo>
      </Cartao>
    </div>
  );
}
