import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL nao configurada. Copie o .env.example para .env e preencha a conexao do banco.",
  );
}

function criarCliente() {
  const pool = new Pool({
    connectionString,

    // Poucas conexoes por instancia: em serverless cada funcao abre o proprio
    // pool, e o Postgres gerenciado tem limite baixo de conexoes simultaneas.
    max: 5,

    // Fecha as conexoes ociosas antes do servidor fazer isso por conta propria.
    // Sem isso, o pool guarda um socket que o Neon ja derrubou e a proxima
    // requisicao morre com "Connection terminated unexpectedly".
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,

    // Mantem o socket vivo e detecta queda de rede em vez de travar esperando.
    keepAlive: true,
  });

  // Um erro em uma conexao ociosa e emitido no pool, nao na requisicao. Sem
  // este ouvinte o processo inteiro cairia por uma conexao que o banco fechou.
  pool.on("error", (erro) => {
    console.error("[banco] conexao ociosa caiu:", erro.message);
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
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
