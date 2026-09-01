import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioLogin } from "@/app/login/formulario";
import { LogoCompleta } from "@/components/logo";
import { verificarSessao } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function PaginaLogin() {
  // Quem ja esta autenticado nao precisa ver o login de novo.
  if (await verificarSessao()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoCompleta largura={384} prioridade className="shadow-lg shadow-black/40" />
        </div>

        <h1 className="text-lg font-semibold text-texto">Acesso ao sistema</h1>
        <p className="mt-1 mb-6 text-sm text-texto-fraco">
          Controle de estoque, serviços e cotações.
        </p>

        <FormularioLogin />
      </div>
    </main>
  );
}
