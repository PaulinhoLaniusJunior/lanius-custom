import { z } from "zod";

import { Decimal, parseDecimalBR } from "./decimal";

/**
 * Peças de validação compartilhadas pelas Server Actions.
 *
 * Os campos numéricos chegam como texto livre do formulário, aceitando tanto
 * "1.234,56" quanto "1234.56" — a conversão para `Decimal` acontece aqui, uma
 * única vez, antes de qualquer conta.
 */

/** Valor numérico obrigatório. */
export function decimalObrigatorio(mensagem = "Informe um número válido.") {
  return z.unknown().transform((valor, ctx): Decimal => {
    const numero = parseDecimalBR(valor);
    if (numero === null) {
      ctx.addIssue({ code: "custom", message: mensagem });
      return z.NEVER;
    }
    return numero;
  });
}

/** Valor numérico opcional: campo em branco vira `null`. */
export function decimalOpcional(mensagem = "Informe um número válido.") {
  return z.unknown().transform((valor, ctx): Decimal | null => {
    if (valor === null || valor === undefined || String(valor).trim() === "") {
      return null;
    }
    const numero = parseDecimalBR(valor);
    if (numero === null) {
      ctx.addIssue({ code: "custom", message: mensagem });
      return z.NEVER;
    }
    return numero;
  });
}

/** Valor numérico opcional que, quando informado, precisa ser maior que zero. */
export function decimalPositivoOpcional(mensagem = "Informe um valor maior que zero.") {
  return decimalOpcional(mensagem).refine(
    (valor) => valor === null || valor.gt(0),
    { message: mensagem },
  );
}

/** Texto obrigatório, já sem espaços nas pontas. */
export function textoObrigatorio(mensagem: string, maximo = 200) {
  return z.string().trim().min(1, mensagem).max(maximo);
}

/** Texto opcional: campo em branco vira `null` em vez de string vazia. */
export function textoOpcional(maximo = 500) {
  return z
    .string()
    .trim()
    .max(maximo)
    .transform((valor) => (valor === "" ? null : valor))
    .nullable()
    .catch(null);
}

/** Data de `<input type="date">`, normalizada em UTC sem hora. */
export function dataObrigatoria(mensagem = "Informe uma data válida.") {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)
    .transform((valor) => new Date(`${valor}T00:00:00.000Z`));
}

/** Data opcional de `<input type="date">`. */
export function dataOpcional(mensagem = "Informe uma data válida.") {
  return z.unknown().transform((valor, ctx): Date | null => {
    const texto = String(valor ?? "").trim();
    if (texto === "") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      ctx.addIssue({ code: "custom", message: mensagem });
      return z.NEVER;
    }
    return new Date(`${texto}T00:00:00.000Z`);
  });
}

/** Só os dígitos do telefone; campo em branco vira `null`. */
export const telefone = z
  .string()
  .trim()
  .transform((valor) => {
    const digitos = valor.replace(/\D/g, "");
    return digitos === "" ? null : digitos;
  })
  .nullable()
  .catch(null);

/** Transforma os erros do Zod no formato que os formulários exibem por campo. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = problema.path.join(".");
    if (campo && !campos[campo]) campos[campo] = problema.message;
  }
  return campos;
}
