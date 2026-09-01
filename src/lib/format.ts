import { dec, type ValorDecimal } from "./decimal";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMERO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "R$ 1.234,56" */
export function formatarMoeda(valor: ValorDecimal | null | undefined): string {
  return MOEDA.format(dec(valor).toNumber());
}

/** "1.234,5" — sem simbolo de moeda, para quantidades. */
export function formatarNumero(valor: ValorDecimal | null | undefined): string {
  return NUMERO.format(dec(valor).toNumber());
}

/** "12,5 L" */
export function formatarQuantidade(
  valor: ValorDecimal | null | undefined,
  unidade: string,
): string {
  return `${formatarNumero(valor)} ${unidade}`;
}

/** "01/09/2026" — datas sem hora sao lidas em UTC, como sao gravadas. */
export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return "-";
  return DATA.format(typeof data === "string" ? new Date(data) : data);
}

/** "01/09/2026 14:30" */
export function formatarDataHora(data: Date | string | null | undefined): string {
  if (!data) return "-";
  return DATA_HORA.format(typeof data === "string" ? new Date(data) : data);
}

/** Data no formato aceito por `<input type="date">`. */
export function paraCampoData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Hoje, no fuso de Brasilia, no formato aceito por `<input type="date">`. */
export function hojeCampoData(): string {
  const agora = new Date();
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 10);
}

/** "(66) 99988-7155" a partir dos digitos digitados. */
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return "-";
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}

/** Link de conversa no WhatsApp, ou `null` se o numero nao for valido. */
export function linkWhatsapp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/55${digitos}`;
}
