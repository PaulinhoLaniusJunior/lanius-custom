"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Truck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ItemNav = {
  href: string;
  rotulo: string;
  rotuloCurto: string;
  Icone: typeof LayoutDashboard;
};

/** As cinco telas do dia a dia. Aparecem na barra inferior do celular. */
export const ITENS_PRINCIPAIS: ItemNav[] = [
  {
    href: "/",
    rotulo: "Painel",
    rotuloCurto: "Painel",
    Icone: LayoutDashboard,
  },
  {
    href: "/produtos",
    rotulo: "Estoque",
    rotuloCurto: "Estoque",
    Icone: Package,
  },
  {
    href: "/servicos",
    rotulo: "Serviços",
    rotuloCurto: "Serviços",
    Icone: ClipboardList,
  },
  {
    href: "/fornecedores",
    rotulo: "Fornecedores",
    rotuloCurto: "Fornec.",
    Icone: Truck,
  },
  {
    href: "/cotacoes",
    rotulo: "Cotações",
    rotuloCurto: "Cotações",
    Icone: FileText,
  },
];

/** Cadastros de apoio, usados de vez em quando. */
export const ITENS_SECUNDARIOS: ItemNav[] = [
  {
    href: "/funcionarios",
    rotulo: "Funcionários",
    rotuloCurto: "Equipe",
    Icone: Users,
  },
];

function estaAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacaoLateral() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITENS_PRINCIPAIS.map(({ href, rotulo, Icone }) => {
        const ativo = estaAtivo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-marca/12 text-texto"
                : "text-texto-suave hover:bg-superficie hover:text-texto",
            )}
          >
            <Icone
              className={cn("size-5 shrink-0", ativo && "text-marca-clara")}
              aria-hidden
            />
            {rotulo}
          </Link>
        );
      })}

      <hr className="my-2 border-borda" />

      {ITENS_SECUNDARIOS.map(({ href, rotulo, Icone }) => {
        const ativo = estaAtivo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-marca/12 text-texto"
                : "text-texto-suave hover:bg-superficie hover:text-texto",
            )}
          >
            <Icone
              className={cn("size-5 shrink-0", ativo && "text-marca-clara")}
              aria-hidden
            />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavegacaoInferior() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-borda bg-fundo/95 backdrop-blur lg:hidden nao-imprimir"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITENS_PRINCIPAIS.map(({ href, rotuloCurto, Icone }) => {
          const ativo = estaAtivo(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.7rem] font-medium transition-colors",
                  ativo ? "text-marca-clara" : "text-texto-fraco",
                )}
              >
                <Icone className="size-5" aria-hidden />
                <span className="leading-none">{rotuloCurto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
