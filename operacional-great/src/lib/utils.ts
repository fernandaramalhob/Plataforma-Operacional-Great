import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número como moeda BRL: R$ 1.234,56
 * @param value - Valor numérico
 * @param decimals - Casas decimais (padrão: 2)
 * @param showSymbol - Mostrar "R$ " (padrão: true)
 */
export function formatBRL(value: number, decimals = 2, showSymbol = true): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Formata um número como moeda BRL sem centavos: R$ 1.235
 */
export function formatBRLShort(value: number, showSymbol = true): string {
  return formatBRL(Math.round(value), 0, showSymbol);
}
