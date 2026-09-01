import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";

import {
  TabelaPrecos,
  type LinhaPreco,
} from "@/app/(app)/fornecedores/[id]/tabela-precos";
import { FormularioFornecedor } from "@/app/(app)/fornecedores/formulario-fornecedor";
import { estiloBotao } from "@/components/ui/botao";
import {
  CabecalhoPagina,
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  Etiqueta,
  Indicador,
} from "@/components/ui/layout";
import { alternarFornecedorAtivo } from "@/lib/actions/fornecedores";
import { Decimal } from "@/lib/decimal";
import { formatarData, formatarMoeda, formatarTelefone, linkWhatsapp } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROTULO_UNIDADE } from "@/lib/rotulos";

export async function generateMetadata(
  props: PageProps<"/fornecedores/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id },
    select: { nome: true },
  });
  return { title: fornecedor?.nome ?? "Fornecedor" };
}

export default async function DetalheFornecedor(
  props: PageProps<"/fornecedores/[id]">,
) {
  const { id } = await props.params;

  const [fornecedor, produtos, todosOsPrecos] = await Promise.all([
    prisma.fornecedor.findUnique({
      where: { id },
      include: { precos: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, categoria: true, unidade: true },
      orderBy: { nome: "asc" },
    }),
    // Preços de todos os fornecedores, para mostrar quanto está o mais barato
    // de cada produto ao lado do preço que está sendo digitado.
    prisma.precoFornecedor.findMany({
      select: { produtoId: true, preco: true },
    }),
  ]);

  if (!fornecedor) notFound();

  const precoDoFornecedor = new Map(
    fornecedor.precos.map((preco) => [preco.produtoId, preco]),
  );

  const melhorPorProduto = new Map<string, Decimal>();
  for (const preco of todosOsPrecos) {
    const atual = melhorPorProduto.get(preco.produtoId);
    if (!atual || preco.preco.lt(atual)) {
      melhorPorProduto.set(preco.produtoId, preco.preco);
    }
  }

  const linhas: LinhaPreco[] = produtos.map((produto) => {
    const meu = precoDoFornecedor.get(produto.id);
    const melhor = melhorPorProduto.get(produto.id);

    return {
      produtoId: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      unidade: ROTULO_UNIDADE[produto.unidade],
      preco: meu ? meu.preco.toFixed(2).replace(".", ",") : "",
      atualizadoEm: meu ? formatarData(meu.atualizadoEm) : null,
      melhorPreco: melhor ? formatarMoeda(melhor) : null,
      ehOMaisBarato: Boolean(meu && melhor && meu.preco.eq(melhor)),
    };
  });

  const maisBaratos = linhas.filter((linha) => linha.ehOMaisBarato).length;
  const whatsapp = linkWhatsapp(fornecedor.telefone);

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
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {fornecedor.nome}
            {!fornecedor.ativo && <Etiqueta>Inativo</Etiqueta>}
          </span>
        }
        descricao={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {fornecedor.cidade && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {fornecedor.cidade}
              </span>
            )}
            {fornecedor.telefone && (
              <span className="flex items-center gap-1.5">
                <MessageCircle className="size-3.5" aria-hidden />
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
              </span>
            )}
          </span>
        }
        acao={
          <form action={alternarFornecedorAtivo}>
            <input type="hidden" name="id" value={fornecedor.id} />
            <button type="submit" className={estiloBotao("secundario", "pequeno")}>
              {fornecedor.ativo ? "Desativar" : "Reativar"}
            </button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Indicador
          rotulo="Produtos com preço"
          valor={fornecedor.precos.length}
          detalhe={`de ${produtos.length} no estoque`}
        />
        <Indicador
          rotulo="Mais barato em"
          valor={maisBaratos}
          tom={maisBaratos > 0 ? "positivo" : "neutro"}
          detalhe="produtos"
        />
      </div>

      <Cartao>
        <CartaoCabecalho
          titulo="Tabela de preços"
          descricao="Digite os preços da lista do fornecedor e salve tudo de uma vez."
        />
        <TabelaPrecos fornecedorId={fornecedor.id} linhas={linhas} />
      </Cartao>

      {fornecedor.observacao && (
        <Cartao>
          <CartaoCabecalho titulo="Observações" />
          <CartaoCorpo>
            <p className="text-sm whitespace-pre-line text-texto-suave">
              {fornecedor.observacao}
            </p>
          </CartaoCorpo>
        </Cartao>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg border border-borda bg-superficie/40 px-4 py-3 text-sm font-medium text-texto-suave hover:text-texto">
          Editar cadastro
        </summary>
        <Cartao className="mt-3 max-w-2xl">
          <CartaoCorpo>
            <FormularioFornecedor
              fornecedor={{
                id: fornecedor.id,
                nome: fornecedor.nome,
                telefone: fornecedor.telefone,
                cidade: fornecedor.cidade,
                observacao: fornecedor.observacao,
              }}
            />
          </CartaoCorpo>
        </Cartao>
      </details>
    </div>
  );
}
