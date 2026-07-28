import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Compact INR for tight UI (₹9.5L, ₹1.2Cr). */
export function formatCurrencyCompact(amount: number): string {
  const n = Number(amount) || 0
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1).replace(/\.0$/, '')}Cr`
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1).replace(/\.0$/, '')}L`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}
