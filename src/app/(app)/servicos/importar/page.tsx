import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { FormularioImportacao } from "@/app/(app)/servicos/importar/formulario-importacao";
import { estiloBotao } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
} from "@/components/ui/layout";

export const metadata: Metadata = { title: "Importar planilha" };

export default function ImportarServico() {
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
        titulo="Importar serviço de planilha"
        descricao="Para trazer um serviço que foi anotado fora do sistema, com os produtos já usados."
      />

      <Cartao>
        <CartaoCabecalho
          titulo="Antes de tudo: baixe o modelo"
          descricao="A planilha precisa ter as abas e as colunas do modelo. Preencha nele e o sistema entende."
          acao={
            // Link comum, e não fetch: o navegador cuida do download sozinho.
            <a href="/servicos/modelo" className={estiloBotao("secundario")} download>
              <Download className="size-4" aria-hidden />
              Baixar modelo
            </a>
          }
        />
        <CartaoCorpo>
          <ul className="flex flex-col gap-1.5 text-sm text-texto-suave">
            <li>
              A aba <strong className="text-texto">Serviço</strong> traz cliente, veículo e
              data de início — os três são obrigatórios.
            </li>
            <li>
              A aba <strong className="text-texto">Produtos</strong> traz o que já foi usado,
              com quantidade e o preço que você pagou.
            </li>
            <li>
              As abas <strong className="text-texto">Gastos</strong> e{" "}
              <strong className="text-texto">Equipe</strong> são opcionais.
            </li>
            <li className="text-texto-fraco">
              Produto que ainda não existe no cadastro é criado automaticamente. O saldo e o
              custo médio do estoque atual não mudam.
            </li>
          </ul>
        </CartaoCorpo>
      </Cartao>

      <FormularioImportacao />
    </div>
  );
}
