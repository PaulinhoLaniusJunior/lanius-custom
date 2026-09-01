"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { criarSessao, encerrarSessao } from "@/lib/session";

import type { EstadoFormulario } from "./tipos";

const esquemaLogin = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").toLowerCase(),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrar(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = esquemaLogin.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!analise.success) {
    return { erro: "Preencha o e-mail e a senha." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: analise.data.email },
  });

  // Mesma mensagem para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entregaria quais e-mails existem no sistema.
  const generico = { erro: "E-mail ou senha incorretos." };

  if (!usuario || !usuario.ativo) {
    // Gasta o mesmo tempo de uma verificacao real, para o tempo de resposta
    // nao revelar se o e-mail existe.
    await bcrypt.compare(analise.data.senha, "$2b$10$invalidosaltinvalidosaltuO");
    return generico;
  }

  const senhaConfere = await bcrypt.compare(analise.data.senha, usuario.senhaHash);
  if (!senhaConfere) return generico;

  await criarSessao({ usuarioId: usuario.id, nome: usuario.nome });
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
