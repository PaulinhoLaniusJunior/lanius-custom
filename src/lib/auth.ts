import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";
import { lerSessao, type Sessao } from "./session";

/**
 * Camada unica de verificacao de acesso.
 *
 * Toda pagina e toda Server Action passam por aqui: Server Actions sao
 * alcancaveis por POST direto, entao nao basta proteger a navegacao.
 * O `cache` do React garante uma unica consulta por requisicao.
 */
export const verificarSessao = cache(async (): Promise<Sessao | null> => {
  const sessao = await lerSessao();
  if (!sessao) return null;

  // Confere no banco: um usuario desativado perde o acesso na hora, mesmo
  // com um cookie ainda dentro da validade.
  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: { id: true, nome: true, ativo: true },
  });

  if (!usuario || !usuario.ativo) return null;

  return { usuarioId: usuario.id, nome: usuario.nome };
});

/** Exige uma sessao valida; redireciona para o login quando nao houver. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await verificarSessao();
  if (!sessao) redirect("/login");
  return sessao;
}
