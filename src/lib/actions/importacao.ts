"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSessao } from "@/lib/auth";
import { MARCA_IMPORTACAO, consumoHistorico } from "@/lib/domain/importacao";
import { expandirPeriodo } from "@/lib/domain/mao-de-obra";
import { resumoDoServico } from "@/lib/domain/servico";
import { normalizar } from "@/lib/planilha/colunas";
import {
  lerPlanilha,
  totalDosProdutos,
  type PlanilhaLida,
} from "@/lib/planilha/leitor";
import { formatarData, formatarMoeda, formatarNumero } from "@/lib/format";
import {
  type EstadoImportacao,
  type PreviaProduto,
} from "@/lib/actions/importacao-tipos";
import { prisma } from "@/lib/prisma";
import { ROTULO_CATEGORIA_GASTO, ROTULO_REMUNERACAO, ROTULO_STATUS_SERVICO } from "@/lib/rotulos";

/**
 * Importação de serviço por planilha.
 *
 * São duas etapas: `analisarPlanilha` confere e mostra o que vai acontecer,
 * `importarPlanilha` grava. As duas leem o arquivo original — a confirmação
 * nunca confia num resumo que passou pelo navegador.
 */

/** Lê o arquivo enviado no campo `planilha` do formulário. */
async function extrairArquivo(
  formData: FormData,
): Promise<ArrayBuffer | { erro: string }> {
  const arquivo = formData.get("planilha");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha a planilha preenchida antes de enviar." };
  }
  if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
    return {
      erro: "O arquivo precisa ser .xlsx. Se estiver em .xls ou .csv, abra no Excel e salve como .xlsx.",
    };
  }

  return arquivo.arrayBuffer();
}

/**
 * Procura o produto do jeito que uma pessoa procuraria: primeiro pelo código,
 * depois pelo nome, sem se importar com acento ou maiúscula.
 */
function acharProduto(
  cadastrados: { id: string; nome: string; codigo: string | null }[],
  procurado: { produto: string; codigo: string | null },
) {
  if (procurado.codigo) {
    const porCodigo = cadastrados.find(
      (item) => item.codigo && normalizar(item.codigo) === normalizar(procurado.codigo),
    );
    if (porCodigo) return porCodigo;
  }
  return cadastrados.find((item) => normalizar(item.nome) === normalizar(procurado.produto));
}

/** Dias que cada pessoa da equipe vai receber, a partir do período informado. */
function diasDaEquipe(membro: PlanilhaLida["equipe"][number]): Date[] {
  if (!membro.diaInicial) return [];
  return expandirPeriodo(
    membro.diaInicial,
    membro.diaFinal ?? membro.diaInicial,
    membro.incluirFimDeSemana,
  );
}

/** Confere e resume, sem gravar nada. */
export async function analisarPlanilha(
  _anterior: EstadoImportacao,
  formData: FormData,
): Promise<EstadoImportacao> {
  await exigirSessao();

  const arquivo = await extrairArquivo(formData);
  if ("erro" in arquivo) return { erro: arquivo.erro };

  const leitura = await lerPlanilha(arquivo);
  if (!leitura.ok) {
    return {
      erro: "A planilha não pôde ser importada. Corrija os pontos abaixo e envie de novo.",
      problemas: leitura.erros,
      avisos: leitura.avisos,
    };
  }

  const { servico, produtos, gastos, equipe } = leitura.dados;

  const [cadastrados, funcionarios, duplicado] = await Promise.all([
    prisma.produto.findMany({ select: { id: true, nome: true, codigo: true } }),
    prisma.funcionario.findMany({ select: { id: true, nome: true } }),
    prisma.servico.findFirst({
      where: {
        cliente: { equals: servico.cliente, mode: "insensitive" },
        veiculo: { equals: servico.veiculo, mode: "insensitive" },
        dataInicio: servico.dataInicio,
      },
      select: { numero: true },
    }),
  ]);

  const avisos = [...leitura.avisos];
  if (duplicado) {
    avisos.push({
      aba: "Serviço",
      linha: null,
      coluna: null,
      mensagem: `Já existe o serviço #${duplicado.numero} para este cliente, veículo e data de início. Confira antes de importar de novo.`,
    });
  }

  const previaProdutos: PreviaProduto[] = produtos.map((item) => ({
    linha: item.linha,
    produto: item.produto,
    unidade: item.unidade,
    quantidade: formatarNumero(item.quantidade),
    precoUnitario: formatarMoeda(item.precoUnitario),
    custoTotal: formatarMoeda(item.custoTotal),
    novo: !acharProduto(cadastrados, item),
  }));

  const previaEquipe = equipe.map((membro) => ({
    nome: membro.funcionario,
    remuneracao: ROTULO_REMUNERACAO[membro.remuneracao],
    dias: diasDaEquipe(membro).length,
    novo: !funcionarios.some((f) => normalizar(f.nome) === normalizar(membro.funcionario)),
  }));

  const resumo = resumoDoServico({
    valorOrcado: servico.valorOrcado,
    custosProdutos: produtos.map((item) => item.custoTotal),
    gastos: gastos.map((item) => item.valor),
    equipe: equipe.map((membro) => ({
      alocacao: {
        tipoRemuneracao: membro.remuneracao,
        salarioMensal: membro.salarioMensal,
        valorDiaria: membro.valorDiaria,
        percentualComissao: membro.percentualComissao,
      },
      dias: diasDaEquipe(membro),
    })),
  });

  return {
    avisos,
    previa: {
      servico: {
        cliente: servico.cliente,
        veiculo: servico.veiculo,
        placa: servico.placa,
        situacao: ROTULO_STATUS_SERVICO[servico.status],
        dataInicio: formatarData(servico.dataInicio),
        dataConclusao: servico.dataConclusao ? formatarData(servico.dataConclusao) : null,
        valorOrcado: formatarMoeda(servico.valorOrcado),
      },
      produtos: previaProdutos,
      gastos: gastos.map((item) => ({
        descricao: item.descricao,
        categoria:
          ROTULO_CATEGORIA_GASTO[item.categoria as keyof typeof ROTULO_CATEGORIA_GASTO],
        valor: formatarMoeda(item.valor),
      })),
      equipe: previaEquipe,
      totais: {
        produtos: formatarMoeda(totalDosProdutos(produtos)),
        gastos: formatarMoeda(resumo.custoGastos),
        maoDeObra: formatarMoeda(resumo.custoMaoDeObra),
        custoTotal: formatarMoeda(resumo.custoTotal),
        margem: formatarMoeda(resumo.margem),
        margemNegativa: resumo.margem.lt(0),
      },
      produtosNovos: previaProdutos.filter((item) => item.novo).length,
      funcionariosNovos: previaEquipe.filter((item) => item.novo).length,
    },
  };
}

/**
 * Grava tudo em uma transação só: ou o serviço entra inteiro, ou nada entra.
 *
 * O arquivo é lido e conferido de novo aqui — a etapa de conferência serve
 * para a pessoa decidir, não como fonte de dados confiável.
 */
export async function importarPlanilha(
  _anterior: EstadoImportacao,
  formData: FormData,
): Promise<EstadoImportacao> {
  await exigirSessao();

  const arquivo = await extrairArquivo(formData);
  if ("erro" in arquivo) return { erro: arquivo.erro };

  const leitura = await lerPlanilha(arquivo);
  if (!leitura.ok) {
    return {
      erro: "A planilha não pôde ser importada. Corrija os pontos abaixo e envie de novo.",
      problemas: leitura.erros,
      avisos: leitura.avisos,
    };
  }

  const { servico, produtos, gastos, equipe } = leitura.dados;
  let servicoId: string;

  try {
    servicoId = await prisma.$transaction(
      async (tx) => {
        const criado = await tx.servico.create({
          data: {
            cliente: servico.cliente,
            telefone: servico.telefone,
            veiculo: servico.veiculo,
            placa: servico.placa,
            descricao: servico.descricao,
            valorOrcado: servico.valorOrcado,
            status: servico.status,
            dataInicio: servico.dataInicio,
            dataConclusao: servico.dataConclusao,
            observacao: servico.observacao,
          },
        });

        const cadastrados = await tx.produto.findMany({
          select: { id: true, nome: true, codigo: true },
        });

        for (const item of produtos) {
          const existente = acharProduto(cadastrados, item);

          const produto = existente
            ? await tx.produto.findUniqueOrThrow({
                where: { id: existente.id },
                select: { id: true, saldoAtual: true, custoMedio: true },
              })
            : await tx.produto.create({
                data: {
                  nome: item.produto,
                  // Código repetido quebraria a chave única; sem código o
                  // produto é encontrado pelo nome nas próximas importações.
                  codigo: item.codigo,
                  unidade: item.unidade as never,
                },
                select: { id: true, saldoAtual: true, custoMedio: true },
              });

          if (!existente) {
            cadastrados.push({
              id: produto.id,
              nome: item.produto,
              codigo: item.codigo,
            });
          }

          const consumo = consumoHistorico({
            saldoAtual: produto.saldoAtual,
            custoMedio: produto.custoMedio,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
          });

          // O produto entra e sai: o saldo não muda. O custo médio só é
          // gravado quando a importação acabou de defini-lo.
          if (consumo.definiuCustoMedio) {
            await tx.produto.update({
              where: { id: produto.id },
              data: { custoMedio: consumo.custoMedio },
            });
          }

          await tx.movimentoEstoque.create({
            data: {
              produtoId: produto.id,
              tipo: "ENTRADA",
              quantidade: consumo.entrada.quantidade,
              custoUnitario: consumo.entrada.custoUnitario,
              custoTotal: consumo.entrada.custoTotal,
              documento: MARCA_IMPORTACAO,
              observacao: `Compra anterior, lançada junto com o serviço`,
              data: item.data ?? servico.dataInicio,
            },
          });

          await tx.movimentoEstoque.create({
            data: {
              produtoId: produto.id,
              servicoId: criado.id,
              tipo: "SAIDA_SERVICO",
              quantidade: consumo.saida.quantidade,
              custoUnitario: consumo.saida.custoUnitario,
              custoTotal: consumo.saida.custoTotal,
              documento: MARCA_IMPORTACAO,
              observacao: item.observacao,
              data: item.data ?? servico.dataInicio,
            },
          });
        }

        if (gastos.length > 0) {
          await tx.gastoServico.createMany({
            data: gastos.map((item) => ({
              servicoId: criado.id,
              descricao: item.descricao,
              categoria: item.categoria as never,
              valor: item.valor,
              data: item.data ?? servico.dataInicio,
            })),
          });
        }

        for (const membro of equipe) {
          const jaCadastrado = await tx.funcionario.findFirst({
            where: { nome: { equals: membro.funcionario, mode: "insensitive" } },
            select: { id: true },
          });

          const funcionario =
            jaCadastrado ??
            (await tx.funcionario.create({
              data: {
                nome: membro.funcionario,
                tipoPadrao: membro.remuneracao,
                salarioMensal: membro.salarioMensal,
                valorDiariaPadrao: membro.valorDiaria,
                percentualComissaoPadrao: membro.percentualComissao,
              },
              select: { id: true },
            }));

          const alocacao = await tx.servicoFuncionario.create({
            data: {
              servicoId: criado.id,
              funcionarioId: funcionario.id,
              nome: membro.funcionario,
              tipoRemuneracao: membro.remuneracao,
              salarioMensal: membro.salarioMensal,
              valorDiaria: membro.valorDiaria,
              percentualComissao: membro.percentualComissao,
            },
          });

          const dias = diasDaEquipe(membro);
          if (dias.length > 0) {
            await tx.diaTrabalhado.createMany({
              data: dias.map((data) => ({
                servicoFuncionarioId: alocacao.id,
                data,
              })),
              skipDuplicates: true,
            });
          }
        }

        return criado.id;
      },
      // Uma planilha com dezenas de produtos não cabe nos 5 s do padrão.
      { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : "";
    return {
      erro: detalhe.includes("Unique")
        ? "Um dos produtos tem código repetido no cadastro. Ajuste o código na planilha e envie de novo."
        : "Não foi possível importar a planilha. Nada foi gravado.",
    };
  }

  revalidatePath("/");
  revalidatePath("/servicos");
  revalidatePath("/produtos");
  redirect(`/servicos/${servicoId}`);
}

