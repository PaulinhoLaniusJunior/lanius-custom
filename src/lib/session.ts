import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const NOME_COOKIE = "lanius_sessao";
const DURACAO_DIAS = 30;

const segredo = process.env.SESSION_SECRET;

if (!segredo || segredo.length < 16) {
  throw new Error(
    "SESSION_SECRET ausente ou curta demais. Gere uma com: openssl rand -base64 32",
  );
}

const chave = new TextEncoder().encode(segredo);

export type Sessao = {
  usuarioId: string;
  nome: string;
};

async function assinar(dados: Sessao, expiraEm: Date): Promise<string> {
  return new SignJWT({ ...dados })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(chave);
}

async function verificar(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, chave, { algorithms: ["HS256"] });
    if (typeof payload.usuarioId !== "string" || typeof payload.nome !== "string") {
      return null;
    }
    return { usuarioId: payload.usuarioId, nome: payload.nome };
  } catch {
    // Token invalido, adulterado ou expirado: trata como visitante.
    return null;
  }
}

export async function criarSessao(dados: Sessao): Promise<void> {
  const expiraEm = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);
  const token = await assinar(dados, expiraEm);
  const armazem = await cookies();

  armazem.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
}

export async function lerSessao(): Promise<Sessao | null> {
  const armazem = await cookies();
  return verificar(armazem.get(NOME_COOKIE)?.value);
}

export async function encerrarSessao(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(NOME_COOKIE);
}
