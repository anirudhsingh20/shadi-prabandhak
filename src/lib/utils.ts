import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Lowercase slug for catalog keys (relations, made-by, sources, …). */
export function slugifyKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
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

/** Indian-style amount breakdown, e.g. 120000 → "1 Lakh · 20 Thousand". */
export function formatAmountInWords(amount: number): string | null {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n) || n <= 0) return null

  let rem = n
  const major: string[] = []

  const crore = Math.floor(rem / 1_00_00_000)
  rem %= 1_00_00_000
  const lakh = Math.floor(rem / 1_00_000)
  rem %= 1_00_000
  const thousand = Math.floor(rem / 1_000)
  rem %= 1_000
  const hundred = Math.floor(rem / 100)
  rem %= 100

  if (crore > 0) major.push(`${crore} Crore`)
  if (lakh > 0) major.push(`${lakh} Lakh`)
  if (thousand > 0) major.push(`${thousand} Thousand`)
  if (hundred > 0) major.push(`${hundred} Hundred`)

  const suffix = n === 1 ? ' rupee' : ' rupees'

  if (major.length === 0) return rem > 0 ? `${rem.toLocaleString('en-IN')}${suffix}` : null
  if (rem > 0) return `${major.join(' · ')} and ${rem.toLocaleString('en-IN')}${suffix}`

  return `${major.join(' · ')}${suffix}`
}
