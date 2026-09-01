-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('UN', 'L', 'ML', 'KG', 'G', 'M', 'M2', 'CX', 'PC');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA_SERVICO', 'AJUSTE', 'ESTORNO_SERVICO');

-- CreateEnum
CREATE TYPE "StatusServico" AS ENUM ('ORCAMENTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoRemuneracao" AS ENUM ('SALARIO', 'DIARIA', 'COMISSAO');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('TERCEIRIZADO', 'COMBUSTIVEL', 'FERRAMENTA', 'ALIMENTACAO', 'TRANSPORTE', 'OUTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "unidade" "UnidadeMedida" NOT NULL DEFAULT 'UN',
    "saldoAtual" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "custoMedio" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "custoUnitario" DECIMAL(14,4) NOT NULL,
    "custoTotal" DECIMAL(14,2) NOT NULL,
    "fornecedorId" TEXT,
    "servicoId" TEXT,
    "documento" TEXT,
    "observacao" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "cidade" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precos_fornecedor" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "preco" DECIMAL(14,2) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precos_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" TEXT,
    "telefone" TEXT,
    "salarioMensal" DECIMAL(14,2),
    "tipoPadrao" "TipoRemuneracao" NOT NULL DEFAULT 'SALARIO',
    "valorDiariaPadrao" DECIMAL(14,2),
    "percentualComissaoPadrao" DECIMAL(6,3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "cliente" TEXT NOT NULL,
    "telefone" TEXT,
    "veiculo" TEXT NOT NULL,
    "placa" TEXT,
    "descricao" TEXT,
    "valorOrcado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "StatusServico" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servico_funcionarios" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "nome" TEXT NOT NULL,
    "tipoRemuneracao" "TipoRemuneracao" NOT NULL,
    "salarioMensal" DECIMAL(14,2),
    "valorDiaria" DECIMAL(14,2),
    "percentualComissao" DECIMAL(6,3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servico_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_trabalhados" (
    "id" TEXT NOT NULL,
    "servicoFuncionarioId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_trabalhados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_servico" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL DEFAULT 'OUTRO',
    "valor" DECIMAL(14,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "titulo" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao_itens" (
    "id" TEXT NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "cotacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- CreateIndex
CREATE INDEX "produtos_nome_idx" ON "produtos"("nome");

-- CreateIndex
CREATE INDEX "movimentos_estoque_produtoId_data_idx" ON "movimentos_estoque"("produtoId", "data");

-- CreateIndex
CREATE INDEX "movimentos_estoque_servicoId_idx" ON "movimentos_estoque"("servicoId");

-- CreateIndex
CREATE INDEX "fornecedores_nome_idx" ON "fornecedores"("nome");

-- CreateIndex
CREATE INDEX "precos_fornecedor_produtoId_preco_idx" ON "precos_fornecedor"("produtoId", "preco");

-- CreateIndex
CREATE UNIQUE INDEX "precos_fornecedor_fornecedorId_produtoId_key" ON "precos_fornecedor"("fornecedorId", "produtoId");

-- CreateIndex
CREATE INDEX "funcionarios_nome_idx" ON "funcionarios"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_numero_key" ON "servicos"("numero");

-- CreateIndex
CREATE INDEX "servicos_status_dataInicio_idx" ON "servicos"("status", "dataInicio");

-- CreateIndex
CREATE UNIQUE INDEX "servico_funcionarios_servicoId_funcionarioId_key" ON "servico_funcionarios"("servicoId", "funcionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "dias_trabalhados_servicoFuncionarioId_data_key" ON "dias_trabalhados"("servicoFuncionarioId", "data");

-- CreateIndex
CREATE INDEX "gastos_servico_servicoId_idx" ON "gastos_servico"("servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "cotacoes_numero_key" ON "cotacoes"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "cotacao_itens_cotacaoId_produtoId_key" ON "cotacao_itens"("cotacaoId", "produtoId");

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precos_fornecedor" ADD CONSTRAINT "precos_fornecedor_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precos_fornecedor" ADD CONSTRAINT "precos_fornecedor_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_funcionarios" ADD CONSTRAINT "servico_funcionarios_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_funcionarios" ADD CONSTRAINT "servico_funcionarios_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dias_trabalhados" ADD CONSTRAINT "dias_trabalhados_servicoFuncionarioId_fkey" FOREIGN KEY ("servicoFuncionarioId") REFERENCES "servico_funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_servico" ADD CONSTRAINT "gastos_servico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "cotacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
