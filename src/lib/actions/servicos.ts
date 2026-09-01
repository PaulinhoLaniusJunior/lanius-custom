"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirSessao } from "@/lib/auth";
import {
  SaldoInsuficienteError,
  aplicarEntrada,
  aplicarSaida,
} from "@/lib/domain/estoque";
import { prisma } from "@/lib/prisma";
import {
  dataObrigatoria,
  dataOpcional,
  decimalObrigatorio,
  decimalOpcional,
  decimalPositivoOpcional,
  errosPorCampo,
  telefone,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/validacao";

import { falha, type EstadoFormulario } from "./tipos";

/** Revalida o serviço e as telas que dependem de estoque ou de custo. */
function revalidarServico(servicoId?: string) {
  revalidatePath("/");
  revalidatePath("/servicos");
  revalidatePath("/produtos");
  if (servicoId) revalidatePath(`/servicos/${servicoId}`);
}

// ---------------------------------------------------------------------------
// Cadastro do serviço
// ---------------------------------------------------------------------------

const esquemaServico = z.object({
  cliente: textoObrigatorio("Informe o cliente."),
  telefone,
  veiculo: textoObrigatorio("Informe o veículo."),
  placa: textoOpcional(10),
  descricao: textoOpcional(1000),
  valorOrcado: decimalOpcional("Informe um valor orçado válido."),
  status: z.enum(["ORCAMENTO", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]),
  dataInicio: dataObrigatoria(),
  dataConclusao: dataOpcional(),
  observacao: textoOpcional(1000),
});

export async function criarServico(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaServico.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;
  let servicoId: string;

  try {
    const servico = await prisma.servico.create({
      data: {
        cliente: dados.cliente,
        telefone: dados.telefone,
        veiculo: dados.veiculo,
        placa: dados.placa?.toUpperCase() ?? null,
        descricao: dados.descricao,
        valorOrcado: dados.valorOrcado ?? 0,
        status: dados.status,
        dataInicio: dados.dataInicio,
        dataConclusao: dados.dataConclusao,
        observacao: dados.observacao,
      },
    });
    servicoId = servico.id;
  } catch (erro) {
    return falha(erro, "Não foi possível cadastrar o serviço.");
  }

  revalidarServico();
  redirect(`/servicos/${servicoId}`);
}

export async function editarServico(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Serviço não identificado." };

  const analise = esquemaServico.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  try {
    await prisma.servico.update({
      where: { id },
      data: {
        cliente: dados.cliente,
        telefone: dados.telefone,
        veiculo: dados.veiculo,
        placa: dados.placa?.toUpperCase() ?? null,
        descricao: dados.descricao,
        valorOrcado: dados.valorOrcado ?? 0,
        status: dados.status,
        dataInicio: dados.dataInicio,
        // Concluir sem informar a data assume hoje: é o caso comum.
        dataConclusao:
          dados.dataConclusao ??
          (dados.status === "CONCLUIDO" ? new Date() : null),
        observacao: dados.observacao,
      },
    });
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o serviço.");
  }

  revalidarServico(id);
  return { sucesso: "Serviço salvo." };
}

// ---------------------------------------------------------------------------
// Produtos retirados do estoque
// ---------------------------------------------------------------------------

const esquemaConsumo = z.object({
  servicoId: textoObrigatorio("Serviço não identificado."),
  produtoId: textoObrigatorio("Escolha o produto."),
  quantidade: decimalObrigatorio("Informe a quantidade."),
  data: dataObrigatoria(),
  observacao: textoOpcional(200),
});

/**
 * Retira produto do estoque para o serviço.
 *
 * A conferência de saldo e a baixa acontecem na mesma transação: sem isso,
 * dois lançamentos ao mesmo tempo poderiam derrubar o estoque para negativo.
 */
export async function lancarProdutoNoServico(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaConsumo.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  try {
    await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: dados.produtoId },
        select: { id: true, nome: true, unidade: true, saldoAtual: true, custoMedio: true },
      });
      if (!produto) throw new Error("Produto não encontrado.");

      const saida = aplicarSaida({
        saldoAtual: produto.saldoAtual,
        custoMedio: produto.custoMedio,
        quantidade: dados.quantidade,
      });

      await tx.produto.update({
        where: { id: produto.id },
        data: { saldoAtual: saida.saldoAtual },
      });

      await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          servicoId: dados.servicoId,
          tipo: "SAIDA_SERVICO",
          quantidade: dados.quantidade,
          custoUnitario: saida.custoUnitario,
          custoTotal: saida.custoTotal,
          observacao: dados.observacao,
          data: dados.data,
        },
      });
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteError) {
      return {
        erro: `Estoque insuficiente: há ${erro.disponivel.toString()} disponível e você pediu ${erro.solicitado.toString()}.`,
        campos: { quantidade: "Maior que o saldo." },
      };
    }
    return falha(erro, "Não foi possível lançar o produto.");
  }

  revalidarServico(dados.servicoId);
  revalidatePath(`/produtos/${dados.produtoId}`);
  return { sucesso: "Produto lançado no serviço." };
}

/**
 * Desfaz uma baixa: o produto volta ao estoque pelo custo com que saiu.
 *
 * O movimento original é apagado e um de estorno é gravado no lugar, para o
 * histórico do produto mostrar que houve devolução em vez de simplesmente
 * perder o registro.
 */
export async function estornarProdutoDoServico(formData: FormData) {
  await exigirSessao();

  const movimentoId = String(formData.get("movimentoId") ?? "");
  if (!movimentoId) return;

  const servicoId = String(formData.get("servicoId") ?? "");

  await prisma.$transaction(async (tx) => {
    const movimento = await tx.movimentoEstoque.findUnique({
      where: { id: movimentoId },
      include: { produto: { select: { saldoAtual: true, custoMedio: true } } },
    });
    if (!movimento || movimento.tipo !== "SAIDA_SERVICO") return;

    const posicao = aplicarEntrada({
      saldoAtual: movimento.produto.saldoAtual,
      custoMedio: movimento.produto.custoMedio,
      quantidade: movimento.quantidade,
      precoUnitario: movimento.custoUnitario,
    });

    await tx.produto.update({
      where: { id: movimento.produtoId },
      data: { saldoAtual: posicao.saldoAtual, custoMedio: posicao.custoMedio },
    });

    await tx.movimentoEstoque.delete({ where: { id: movimentoId } });

    await tx.movimentoEstoque.create({
      data: {
        produtoId: movimento.produtoId,
        tipo: "ESTORNO_SERVICO",
        quantidade: movimento.quantidade,
        custoUnitario: movimento.custoUnitario,
        custoTotal: movimento.custoTotal,
        observacao: "Devolvido do serviço para o estoque",
      },
    });

    revalidatePath(`/produtos/${movimento.produtoId}`);
  });

  revalidarServico(servicoId);
}

// ---------------------------------------------------------------------------
// Gastos avulsos
// ---------------------------------------------------------------------------

const esquemaGasto = z.object({
  servicoId: textoObrigatorio("Serviço não identificado."),
  descricao: textoObrigatorio("Descreva o gasto."),
  categoria: z.enum([
    "TERCEIRIZADO",
    "COMBUSTIVEL",
    "FERRAMENTA",
    "ALIMENTACAO",
    "TRANSPORTE",
    "OUTRO",
  ]),
  valor: decimalObrigatorio("Informe o valor do gasto."),
  data: dataObrigatoria(),
});

export async function adicionarGasto(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaGasto.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;
  if (dados.valor.lte(0)) {
    return {
      erro: "O valor precisa ser maior que zero.",
      campos: { valor: "Maior que zero." },
    };
  }

  try {
    await prisma.gastoServico.create({ data: dados });
  } catch (erro) {
    return falha(erro, "Não foi possível lançar o gasto.");
  }

  revalidarServico(dados.servicoId);
  return { sucesso: "Gasto lançado." };
}

export async function removerGasto(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("gastoId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "");
  if (!id) return;

  await prisma.gastoServico.delete({ where: { id } });
  revalidarServico(servicoId);
}

// ---------------------------------------------------------------------------
// Equipe e dias trabalhados
// ---------------------------------------------------------------------------

const esquemaAlocacao = z.object({
  servicoId: textoObrigatorio("Serviço não identificado."),
  funcionarioId: textoObrigatorio("Escolha o funcionário."),
  tipoRemuneracao: z.enum(["SALARIO", "DIARIA", "COMISSAO"]),
  salarioMensal: decimalPositivoOpcional("Informe um salário válido."),
  valorDiaria: decimalPositivoOpcional("Informe uma diária válida."),
  percentualComissao: decimalPositivoOpcional("Informe um percentual válido."),
});

/**
 * Vincula um funcionário ao serviço, copiando os valores do cadastro.
 *
 * A cópia é o ponto central: o custo deste serviço fica congelado no que foi
 * combinado hoje, mesmo que o salário mude no mês que vem.
 */
export async function alocarFuncionario(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaAlocacao.safeParse(Object.fromEntries(formData));
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const dados = analise.data;

  if (dados.tipoRemuneracao === "SALARIO" && !dados.salarioMensal) {
    return {
      erro: "Informe o salário usado neste serviço.",
      campos: { salarioMensal: "Obrigatório para mensalista." },
    };
  }
  if (dados.tipoRemuneracao === "DIARIA" && !dados.valorDiaria) {
    return {
      erro: "Informe o valor da diária.",
      campos: { valorDiaria: "Obrigatório para diarista." },
    };
  }
  if (dados.tipoRemuneracao === "COMISSAO" && !dados.percentualComissao) {
    return {
      erro: "Informe o percentual de comissão.",
      campos: { percentualComissao: "Obrigatório para comissionado." },
    };
  }

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: dados.funcionarioId },
    select: { nome: true },
  });
  if (!funcionario) return { erro: "Funcionário não encontrado." };

  try {
    await prisma.servicoFuncionario.create({
      data: {
        servicoId: dados.servicoId,
        funcionarioId: dados.funcionarioId,
        nome: funcionario.nome,
        tipoRemuneracao: dados.tipoRemuneracao,
        salarioMensal: dados.salarioMensal,
        valorDiaria: dados.valorDiaria,
        percentualComissao: dados.percentualComissao,
      },
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes("Unique")) {
      return { erro: "Este funcionário já está neste serviço." };
    }
    return falha(erro, "Não foi possível vincular o funcionário.");
  }

  revalidarServico(dados.servicoId);
  return { sucesso: `${funcionario.nome} vinculado ao serviço.` };
}

export async function removerAlocacao(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("alocacaoId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "");
  if (!id) return;

  await prisma.servicoFuncionario.delete({ where: { id } });
  revalidarServico(servicoId);
}

const esquemaDias = z.object({
  servicoId: textoObrigatorio("Serviço não identificado."),
  alocacaoId: textoObrigatorio("Alocação não identificada."),
  de: dataObrigatoria("Informe a data inicial."),
  ate: dataOpcional("Informe uma data final válida."),
  incluirFimDeSemana: z.coerce.boolean().catch(false),
});

/**
 * Lança dias trabalhados, um ou um período inteiro de uma vez.
 *
 * Marcar dia a dia uma semana de trabalho seria cinco idas ao servidor; na
 * prática o serviço ocupa a pessoa por vários dias seguidos.
 */
export async function lancarDias(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  const analise = esquemaDias.safeParse({
    ...Object.fromEntries(formData),
    incluirFimDeSemana: formData.get("incluirFimDeSemana") === "on",
  });
  if (!analise.success) {
    return { erro: "Confira os campos destacados.", campos: errosPorCampo(analise.error) };
  }

  const { servicoId, alocacaoId, de, ate, incluirFimDeSemana } = analise.data;
  const fim = ate ?? de;

  if (fim < de) {
    return {
      erro: "A data final não pode ser anterior à inicial.",
      campos: { ate: "Anterior à data inicial." },
    };
  }

  const umDia = 24 * 60 * 60 * 1000;
  if ((fim.getTime() - de.getTime()) / umDia > 120) {
    return { erro: "O período não pode passar de 120 dias." };
  }

  const dias: Date[] = [];
  for (let data = de; data <= fim; data = new Date(data.getTime() + umDia)) {
    const diaSemana = data.getUTCDay();
    if (!incluirFimDeSemana && (diaSemana === 0 || diaSemana === 6)) continue;
    dias.push(new Date(data));
  }

  if (dias.length === 0) {
    return { erro: "Nenhum dia útil no período escolhido." };
  }

  try {
    // `skipDuplicates` deixa a operação idempotente: relançar o mesmo
    // período não duplica dias nem infla o custo.
    const resultado = await prisma.diaTrabalhado.createMany({
      data: dias.map((data) => ({ servicoFuncionarioId: alocacaoId, data })),
      skipDuplicates: true,
    });

    revalidarServico(servicoId);
    return {
      sucesso:
        resultado.count === 0
          ? "Esses dias já estavam lançados."
          : `${resultado.count} dia(s) lançados.`,
    };
  } catch (erro) {
    return falha(erro, "Não foi possível lançar os dias.");
  }
}

export async function removerDia(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("diaId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "");
  if (!id) return;

  await prisma.diaTrabalhado.delete({ where: { id } });
  revalidarServico(servicoId);
}

/** Atalho de status usado nos botões do cabeçalho do serviço. */
export async function mudarStatus(formData: FormData) {
  await exigirSessao();

  const id = String(formData.get("servicoId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;

  const validos = ["ORCAMENTO", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"] as const;
  if (!validos.includes(status as (typeof validos)[number])) return;

  await prisma.servico.update({
    where: { id },
    data: {
      status: status as (typeof validos)[number],
      dataConclusao: status === "CONCLUIDO" ? new Date() : null,
    },
  });

  revalidarServico(id);
}

