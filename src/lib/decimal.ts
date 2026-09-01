import { Decimal } from "@prisma/client-runtime-utils";

export { Decimal };

/** Aceita `Decimal`, numero ou string e devolve sempre um `Decimal`. */
export type ValorDecimal = Decimal | number | string;

export function dec(valor: ValorDecimal | null | undefined): Decimal {
  if (valor === null || valor === undefined || valor === "") {
    return new Decimal(0);
  }
  return valor instanceof Decimal ? valor : new Decimal(valor);
}

export const ZERO = new Decimal(0);

/**
 * Converte texto digitado em formulario para `Decimal`.
 * Aceita as duas notacoes usadas no dia a dia: "1.234,56" e "1234.56".
 * Devolve `null` quando o texto nao representa um numero valido.
 */
export function parseDecimalBR(entrada: unknown): Decimal | null {
  if (entrada === null || entrada === undefined) return null;

  const texto = String(entrada).trim();
  if (texto === "") return null;

  const semEspacos = texto.replace(/\s|R\$/g, "");
  const temVirgula = semEspacos.includes(",");

  // Com virgula, o ponto e separador de milhar: "1.234,56" -> "1234.56".
  const normalizado = temVirgula
    ? semEspacos.replace(/\./g, "").replace(",", ".")
    : semEspacos;

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;

  try {
    return new Decimal(normalizado);
  } catch {
    return null;
  }
}

/** Soma uma lista de valores em `Decimal`. */
export function somar(valores: Iterable<ValorDecimal>): Decimal {
  let total = new Decimal(0);
  for (const valor of valores) {
    total = total.plus(dec(valor));
  }
  return total;
}

/** Arredonda para casas decimais usando arredondamento comercial (meio para cima). */
export function arredondar(valor: ValorDecimal, casas: number): Decimal {
  return dec(valor).toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
}

/** Arredonda para 2 casas, a precisao usada em todos os campos de dinheiro. */
export function dinheiro(valor: ValorDecimal): Decimal {
  return arredondar(valor, 2);
}

/** Arredonda para 3 casas, a precisao usada em quantidades de estoque. */
export function quantidade(valor: ValorDecimal): Decimal {
  return arredondar(valor, 3);
}
