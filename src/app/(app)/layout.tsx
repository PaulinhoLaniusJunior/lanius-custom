import { LogOut } from "lucide-react";

import { MarcaCompacta } from "@/components/logo";
import { NavegacaoInferior, NavegacaoLateral } from "@/components/navegacao";
import { estiloBotao } from "@/components/ui/botao";
import { sair } from "@/lib/actions/auth";
import { exigirSessao } from "@/lib/auth";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const sessao = await exigirSessao();

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral: so no desktop. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-borda bg-superficie/40 px-3 py-4 lg:flex nao-imprimir">
        <div className="px-2 pb-5">
          <MarcaCompacta />
        </div>

        <NavegacaoLateral />

        <div className="mt-auto border-t border-borda pt-3">
          <p className="px-3 pb-2 text-xs text-texto-fraco">
            Conectado como
            <span className="block truncate font-medium text-texto-suave">
              {sessao.nome}
            </span>
          </p>
          <form action={sair}>
            <button
              type="submit"
              className={estiloBotao("fantasma", "pequeno", "w-full justify-start")}
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecalho: so no celular. */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-borda bg-fundo/95 px-4 py-2.5 backdrop-blur lg:hidden nao-imprimir">
          <MarcaCompacta />
          <form action={sair}>
            <button
              type="submit"
              aria-label="Sair do sistema"
              className={estiloBotao("fantasma", "pequeno", "px-2")}
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      <NavegacaoInferior />
    </div>
  );
}
