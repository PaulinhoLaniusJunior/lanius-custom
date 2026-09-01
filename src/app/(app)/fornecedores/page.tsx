import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { BotaoLink } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  Etiqueta,
  Vazio,
} from "@/components/ui/layout";
import { Cabecalho, Corpo, Linha, Tabela, Td, Th } from "@/components/ui/tabela";
import { formatarTelefone, linkWhatsapp } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function ListaFornecedores() {
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { precos: true } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Fornecedores"
        descricao="Quem vende o quê e por quanto."
        acao={
          <BotaoLink href="/fornecedores/novo">
            <Plus className="size-4" aria-hidden />
            Fornecedor
          </BotaoLink>
        }
      />

      <Cartao>
        {fornecedores.length === 0 ? (
          <Vazio
            titulo="Nenhum fornecedor cadastrado"
            descricao="Cadastre os fornecedores para poder comparar preços na hora de comprar."
            acao={
              <BotaoLink href="/fornecedores/novo" tamanho="pequeno">
                Cadastrar fornecedor
              </BotaoLink>
            }
          />
        ) : (
          <Tabela>
            <Cabecalho>
              <tr>
                <Th>Fornecedor</Th>
                <Th>Cidade</Th>
                <Th>Telefone</Th>
                <Th numerico>Produtos com preço</Th>
              </tr>
            </Cabecalho>
            <Corpo>
              {fornecedores.map((fornecedor) => {
                const whatsapp = linkWhatsapp(fornecedor.telefone);

                return (
                  <Linha key={fornecedor.id}>
                    <Td>
                      <Link
                        href={`/fornecedores/${fornecedor.id}`}
                        className="font-medium text-texto hover:text-marca-clara"
                      >
                        {fornecedor.nome}
                      </Link>
                      {!fornecedor.ativo && (
                        <Etiqueta className="ml-2">Inativo</Etiqueta>
                      )}
                    </Td>
                    <Td className="text-texto-suave">
                      {fornecedor.cidade ?? "—"}
                    </Td>
                    <Td className="text-texto-suave">
                      {whatsapp ? (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-marca-clara"
                        >
                          {formatarTelefone(fornecedor.telefone)}
                        </a>
                      ) : (
                        formatarTelefone(fornecedor.telefone)
                      )}
                    </Td>
                    <Td numerico>
                      {fornecedor._count.precos > 0 ? (
                        fornecedor._count.precos
                      ) : (
                        <span className="text-texto-fraco">—</span>
                      )}
                    </Td>
                  </Linha>
                );
              })}
            </Corpo>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
