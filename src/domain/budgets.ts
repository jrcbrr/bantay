import { addDays, toISODate } from './dates.ts'
import type { Budget, BudgetPeriod, Centavos, ISODate, Transaction } from './types.ts'

export interface Range {
  start: ISODate
  /** Exclusive. */
  end: ISODate
}

/** Current budget period. Weeks run Monday–Sunday. */
export function periodRange(now: Date, period: BudgetPeriod): Range {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'weekly') {
    const back = (day.getDay() + 6) % 7
    const start = addDays(day, -back)
    return { start: toISODate(start), end: toISODate(addDays(start, 7)) }
  }
  return {
    start: toISODate(new Date(day.getFullYear(), day.getMonth(), 1)),
    end: toISODate(new Date(day.getFullYear(), day.getMonth() + 1, 1)),
  }
}

export interface BudgetProgress {
  spent: Centavos
  limit: Centavos
  remaining: Centavos
  /** 0…∞, 1 = exactly at limit. */
  ratio: number
  status: 'ok' | 'warning' | 'over'
}

export function budgetProgress(budget: Budget, txs: readonly Transaction[], now: Date): BudgetProgress {
  const { start, end } = periodRange(now, budget.period)
  const spent = txs
    .filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId && t.date >= start && t.date < end)
    .reduce((s, t) => s + t.amount, 0)
  const ratio = budget.limit > 0 ? spent / budget.limit : 0
  return {
    spent,
    limit: budget.limit,
    remaining: budget.limit - spent,
    ratio,
    status: ratio > 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok',
  }
}

/** Income vs expense within a range (transfers excluded). */
export function flowBetween(txs: readonly Transaction[], range: Range): { income: Centavos; expense: Centavos } {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.date < range.start || t.date >= range.end) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense }
}
