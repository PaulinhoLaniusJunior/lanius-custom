import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL nao configurada. Copie o .env.example para .env e preencha a conexao do banco.",
  );
}

function criarCliente() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Em desenvolvimento o Next recarrega os modulos a cada alteracao; sem o cache
// global cada recarga abriria um novo pool de conexoes com o banco.
const globalParaPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof criarCliente>;
};

export const prisma = globalParaPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
