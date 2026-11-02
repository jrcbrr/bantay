import type { Centavos } from './types.ts'

const php = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const phpCompact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** ₱1,234.50 */
export function formatPHP(amount: Centavos, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const pesos = amount / 100
  const text = (opts.compact ? phpCompact : php).format(Math.abs(pesos))
  if (amount < 0) return `−${text}`
  if (opts.sign && amount > 0) return `+${text}`
  return text
}

/**
 * Parse user input into centavos. Accepts "150", "1,250.5", "₱99", "2.5k", "25k".
 * Returns null for anything that isn't a positive amount.
 */
export function parseAmount(input: string): Centavos | null {
  const cleaned = input.trim().toLowerCase().replace(/[₱,\s]/g, '').replace(/^php/, '')
  const match = /^(\d+(?:\.\d+)?|\.\d+)(k|m)?$/.exec(cleaned)
  if (!match) return null
  const base = Number(match[1])
  const mult = match[2] === 'k' ? 1_000 : match[2] === 'm' ? 1_000_000 : 1
  const centavos = Math.round(base * mult * 100)
  return centavos > 0 ? centavos : null
}

export function toCentavos(pesos: number): Centavos {
  return Math.round(pesos * 100)
}
