import { toISODate } from './dates.ts'
import type { Centavos, ISODate, Transaction } from './types.ts'

export interface DayTotals {
  income: Centavos
  expense: Centavos
}

/**
 * Weeks of a month for a calendar grid. Each week has 7 cells; days outside the
 * month are `null`. `month` is 0-based like `Date`.
 */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 0): (ISODate | null)[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() - weekStartsOn + 7) % 7

  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, month, d)))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (ISODate | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Income and expense per day. Transfers don't count as either. */
export function dailyTotals(txs: readonly Transaction[]): Map<ISODate, DayTotals> {
  const map = new Map<ISODate, DayTotals>()
  for (const tx of txs) {
    if (tx.type === 'transfer') continue
    const t = map.get(tx.date) ?? { income: 0, expense: 0 }
    t[tx.type] += tx.amount
    map.set(tx.date, t)
  }
  return map
}

/** Totals for a `YYYY-MM` month. */
export function monthTotals(txs: readonly Transaction[], month: string): DayTotals {
  const totals: DayTotals = { income: 0, expense: 0 }
  for (const tx of txs) {
    if (tx.type === 'transfer' || !tx.date.startsWith(month)) continue
    totals[tx.type] += tx.amount
  }
  return totals
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}
