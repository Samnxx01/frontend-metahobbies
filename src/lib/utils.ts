import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeCOP(value: unknown): number {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount)
}

export function formatCOP(value: unknown): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(normalizeCOP(value))
}
