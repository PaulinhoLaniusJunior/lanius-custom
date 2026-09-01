import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Cria (ou atualiza a senha de) um usuario do sistema.
 *
 *   npm run usuario:criar
 *   npm run usuario:criar -- "Paulo" paulo@lanius.com.br senhaSegura
 *
 * Sem argumentos o script pergunta os dados no terminal.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function perguntar(rotulo: string, valorRecebido?: string) {
  if (valorRecebido) return valorRecebido;

  const leitor = createInterface({ input: stdin, output: stdout });
  try {
    return (await leitor.question(`${rotulo}: `)).trim();
  } finally {
    leitor.close();
  }
}

async function main() {
  const [nomeArg, emailArg, senhaArg] = process.argv.slice(2);

  const nome = await perguntar("Nome", nomeArg);
  const email = (await perguntar("E-mail", emailArg)).toLowerCase();
  const senha = await perguntar("Senha", senhaArg);

  if (!nome || !email || !senha) {
    throw new Error("Nome, e-mail e senha sao obrigatorios.");
  }
  if (senha.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { nome, senhaHash, ativo: true },
    create: { nome, email, senhaHash },
  });

  console.log(`Usuario pronto: ${usuario.nome} <${usuario.email}>`);
}

main()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
