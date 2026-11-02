import { addDays, fromISODate, toISODate } from './dates.ts'
import type { Frequency, ISODate, Recurring } from './types.ts'

function clampDay(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, last))
}

/** The next due date after `date`. Monthly/yearly keep `anchorDay` (Jan 31 → Feb 28 → Mar 31). */
export function advance(date: ISODate, frequency: Frequency, anchorDay?: number): ISODate {
  const d = fromISODate(date)
  const day = anchorDay ?? d.getDate()
  switch (frequency) {
    case 'daily':
      return toISODate(addDays(d, 1))
    case 'weekly':
      return toISODate(addDays(d, 7))
    case 'monthly':
      return toISODate(clampDay(d.getFullYear(), d.getMonth() + 1, day))
    case 'yearly':
      return toISODate(clampDay(d.getFullYear() + 1, d.getMonth(), day))
  }
}

export interface Occurrence {
  recurring: Recurring
  date: ISODate
}

/**
 * Every unpaid occurrence due before `before` (exclusive), overdue ones included.
 * Only active items. Capped per item so a daily bill can't run away.
 */
export function occurrencesBefore(items: readonly Recurring[], before: ISODate, cap = 400): Occurrence[] {
  const out: Occurrence[] = []
  for (const r of items) {
    if (!r.active) continue
    let date = r.nextDue
    for (let i = 0; i < cap && date < before; i++) {
      out.push({ recurring: r, date })
      date = advance(date, r.frequency, r.anchorDay)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Total of unpaid bills (expenses) due before `before`. Used to set money aside in safe-to-spend. */
export function billsDueBefore(items: readonly Recurring[], before: ISODate): number {
  return occurrencesBefore(
    items.filter((r) => r.type === 'expense'),
    before,
  ).reduce((s, o) => s + o.recurring.amount, 0)
}

/** Monthly cost of a subscription, for "₱X / month" totals. */
export function monthlyCost(r: Pick<Recurring, 'amount' | 'frequency'>): number {
  switch (r.frequency) {
    case 'daily':
      return Math.round((r.amount * 365) / 12)
    case 'weekly':
      return Math.round((r.amount * 52) / 12)
    case 'monthly':
      return r.amount
    case 'yearly':
      return Math.round(r.amount / 12)
  }
}
