import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes do Tailwind resolvendo conflitos (a ultima vence). */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
