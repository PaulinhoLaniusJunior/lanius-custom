import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { aplicarEntrada } from "../src/lib/domain/estoque";

/**
 * Dados de demonstração para conferir o sistema funcionando.
 *
 *   npm run db:seed
 *
 * Não cria usuários — para isso use `npm run usuario:criar`.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PRODUTOS = [
  { nome: "Tinta PU Branca", codigo: "TIN-001", categoria: "Tintas", unidade: "L", minimo: 15 },
  { nome: "Tinta PU Vermelha", codigo: "TIN-002", categoria: "Tintas", unidade: "L", minimo: 10 },
  { nome: "Verniz PU", codigo: "TIN-010", categoria: "Tintas", unidade: "L", minimo: 8 },
  { nome: "Catalisador PU", codigo: "TIN-020", categoria: "Tintas", unidade: "L", minimo: 5 },
  { nome: "Thinner", codigo: "SOL-001", categoria: "Solventes", unidade: "L", minimo: 20 },
  { nome: "Massa Plástica", codigo: "MAS-001", categoria: "Preparação", unidade: "KG", minimo: 10 },
  { nome: "Lixa 320", codigo: "ABR-320", categoria: "Abrasivos", unidade: "UN", minimo: 50 },
  { nome: "Lixa 600", codigo: "ABR-600", categoria: "Abrasivos", unidade: "UN", minimo: 50 },
  { nome: "Fita crepe 48mm", codigo: "ACE-001", categoria: "Acessórios", unidade: "UN", minimo: 20 },
  { nome: "Disco de corte 7", codigo: "FER-001", categoria: "Ferramentas", unidade: "UN", minimo: 10 },
] as const;

const FORNECEDORES = [
  { nome: "Casa da Tinta", telefone: "66999880001", cidade: "Sinop" },
  { nome: "Distribuidora Sul", telefone: "66999880002", cidade: "Sorriso" },
  { nome: "Tintas Norte", telefone: "66999880003", cidade: "Sinop" },
] as const;

/** Preço por produto e fornecedor, em índice: [Casa da Tinta, Sul, Norte]. */
const PRECOS: Record<string, [number, number, number]> = {
  "TIN-001": [78, 85, 90],
  "TIN-002": [92, 88, 95],
  "TIN-010": [110, 118, 105],
  "TIN-020": [64, 60, 68],
  "SOL-001": [22, 19.5, 21],
  "MAS-001": [25, 27, 24.5],
  "ABR-320": [2.1, 2.4, 1.95],
  "ABR-600": [2.3, 2.6, 2.15],
  "ACE-001": [8.9, 7.8, 8.2],
  "FER-001": [6.5, 6.9, 6.2],
};

/** Entradas iniciais: [código, quantidade, preço unitário]. */
const ENTRADAS: [string, number, number][] = [
  ["TIN-001", 10, 50],
  ["TIN-001", 10, 60],
  ["TIN-002", 12, 92],
  ["TIN-010", 6, 110],
  ["TIN-020", 8, 64],
  ["SOL-001", 40, 21],
  ["MAS-001", 15, 25],
  ["ABR-320", 30, 2.1],
  ["ABR-600", 100, 2.15],
  ["ACE-001", 24, 7.8],
  ["FER-001", 6, 6.2],
];

async function main() {
  console.log("Limpando dados de demonstração...");
  await prisma.movimentoEstoque.deleteMany();
  await prisma.diaTrabalhado.deleteMany();
  await prisma.servicoFuncionario.deleteMany();
  await prisma.gastoServico.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.cotacaoItem.deleteMany();
  await prisma.cotacao.deleteMany();
  await prisma.precoFornecedor.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.funcionario.deleteMany();

  console.log("Criando produtos...");
  const produtos = new Map<string, string>();
  for (const item of PRODUTOS) {
    const produto = await prisma.produto.create({
      data: {
        nome: item.nome,
        codigo: item.codigo,
        categoria: item.categoria,
        unidade: item.unidade,
        estoqueMinimo: item.minimo,
      },
    });
    produtos.set(item.codigo, produto.id);
  }

  console.log("Criando fornecedores e preços...");
  const fornecedores: string[] = [];
  for (const item of FORNECEDORES) {
    const fornecedor = await prisma.fornecedor.create({ data: item });
    fornecedores.push(fornecedor.id);
  }

  for (const [codigo, precos] of Object.entries(PRECOS)) {
    const produtoId = produtos.get(codigo);
    if (!produtoId) continue;
    for (let i = 0; i < precos.length; i += 1) {
      await prisma.precoFornecedor.create({
        data: { fornecedorId: fornecedores[i], produtoId, preco: precos[i] },
      });
    }
  }

  console.log("Lançando entradas de estoque...");
  for (const [codigo, quantidade, preco] of ENTRADAS) {
    const produtoId = produtos.get(codigo);
    if (!produtoId) continue;

    const produto = await prisma.produto.findUniqueOrThrow({
      where: { id: produtoId },
      select: { saldoAtual: true, custoMedio: true },
    });

    const posicao = aplicarEntrada({
      saldoAtual: produto.saldoAtual,
      custoMedio: produto.custoMedio,
      quantidade,
      precoUnitario: preco,
    });

    await prisma.produto.update({
      where: { id: produtoId },
      data: { saldoAtual: posicao.saldoAtual, custoMedio: posicao.custoMedio },
    });

    await prisma.movimentoEstoque.create({
      data: {
        produtoId,
        tipo: "ENTRADA",
        quantidade,
        custoUnitario: preco,
        custoTotal: Number((quantidade * preco).toFixed(2)),
      },
    });
  }

  console.log("Criando funcionários...");
  await prisma.funcionario.createMany({
    data: [
      { nome: "Carlos Pereira", funcao: "Pintor", salarioMensal: 2200, tipoPadrao: "SALARIO" },
      { nome: "Marcos Silva", funcao: "Lanterneiro", salarioMensal: 2400, tipoPadrao: "SALARIO" },
      { nome: "João Batista", funcao: "Auxiliar", valorDiariaPadrao: 140, tipoPadrao: "DIARIA" },
    ],
  });

  const totais = {
    produtos: await prisma.produto.count(),
    fornecedores: await prisma.fornecedor.count(),
    precos: await prisma.precoFornecedor.count(),
    funcionarios: await prisma.funcionario.count(),
  };
  console.log("Pronto:", totais);
}

main()
  .catch((erro: unknown) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
