import { safeToSpendToday } from './allowance.ts'
import { periodRange } from './budgets.ts'
import { addDays, daysBetween, fromISODate, toISODate } from './dates.ts'
import type { Budget, Centavos, ID, ISODate, Transaction } from './types.ts'

/* ---------------- Budget history ---------------- */

export interface BudgetPeriodResult {
  start: ISODate
  end: ISODate
  spent: Centavos
  limit: Centavos
}

/** The last `count` periods (current one included, newest first) for a budget. */
export function budgetHistory(budget: Budget, txs: readonly Transaction[], now: Date, count = 8): BudgetPeriodResult[] {
  const out: BudgetPeriodResult[] = []
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = 0; i < count; i++) {
    const { start, end } = periodRange(cursor, budget.period)
    const spent = txs
      .filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId && t.date >= start && t.date < end)
      .reduce((s, t) => s + t.amount, 0)
    out.push({ start, end, spent, limit: budget.limit })
    cursor = addDays(fromISODate(start), -1)
  }
  return out
}

/* ---------------- Event budgets ---------------- */

export interface EventBudget {
  id: ID
  name: string
  limit: Centavos
  start: ISODate
  /** Inclusive last day. */
  end: ISODate
  color: string
  createdAt: number
}

export function eventSpent(event: Pick<EventBudget, 'id'>, txs: readonly Transaction[]): Centavos {
  return txs.filter((t) => t.type === 'expense' && t.eventId === event.id).reduce((s, t) => s + t.amount, 0)
}

/** Events a transaction on `date` can count toward. */
export function eventsOn(events: readonly EventBudget[], date: ISODate): EventBudget[] {
  return events.filter((e) => e.start <= date && date <= e.end)
}

/* ---------------- Ipon challenge ---------------- */

export type ChallengeKind = 'weekly-52' | 'daily' | 'custom'

export interface Challenge {
  id: ID
  name: string
  kind: ChallengeKind
  /** weekly-52: amount for week 1 (week n saves n × this). daily/custom: amount per step. */
  amount: Centavos
  steps: number
  startDate: ISODate
  /** Indexes of steps you've done. */
  done: number[]
  createdAt: number
}

export function stepAmount(ch: Pick<Challenge, 'kind' | 'amount'>, index: number): Centavos {
  return ch.kind === 'weekly-52' ? ch.amount * (index + 1) : ch.amount
}

export function challengeTotals(ch: Challenge): { saved: Centavos; target: Centavos; doneSteps: number } {
  let target = 0
  for (let i = 0; i < ch.steps; i++) target += stepAmount(ch, i)
  const done = new Set(ch.done)
  let saved = 0
  for (const i of done) if (i >= 0 && i < ch.steps) saved += stepAmount(ch, i)
  return { saved, target, doneSteps: done.size }
}

/** Which step today falls on (0-based), clamped to the challenge length. */
export function currentStep(ch: Pick<Challenge, 'kind' | 'startDate' | 'steps'>, today: Date): number {
  const days = daysBetween(fromISODate(ch.startDate), today)
  const step = ch.kind === 'weekly-52' ? Math.floor(days / 7) : days
  return Math.max(0, Math.min(ch.steps - 1, step))
}

/* ---------------- Wishlist & "can I afford it?" ---------------- */

/**
 * Average money kept per day (income − spending) over the last `lookback` days you've tracked.
 * Lending money isn't counted.
 */
export function savingRate(txs: readonly Transaction[], today: Date, lookback = 30): Centavos {
  const from = toISODate(addDays(today, -lookback))
  const to = toISODate(addDays(today, 1))
  let first: ISODate | undefined
  let net = 0
  for (const t of txs) {
    if (t.debtId || t.type === 'transfer' || t.date < from || t.date >= to) continue
    if (!first || t.date < first) first = t.date
    net += t.type === 'income' ? t.amount : -t.amount
  }
  if (!first) return 0
  const days = Math.max(1, Math.min(lookback, daysBetween(fromISODate(first), today) + 1))
  return Math.round(net / days)
}

/** Days of saving needed to cover `price`, or null if you're not saving at the moment. */
export function daysToAfford(price: Centavos, alreadyHave: Centavos, perDay: Centavos): number | null {
  const need = price - Math.max(0, alreadyHave)
  if (need <= 0) return 0
  if (perDay <= 0) return null
  return Math.ceil(need / perDay)
}

export type AffordVerdict = 'easy' | 'tight' | 'short' | 'no'

export interface AffordResult {
  verdict: AffordVerdict
  /** Safe to spend today right now. */
  safeBefore: Centavos
  /** Safe to spend per day after buying it (for the rest of the baon cycle). */
  safeAfter: Centavos
  /** Spendable money left right after buying. */
  leftAfter: Centavos
}

/**
 * Would buying something for `price` now be okay?
 * - easy: fits inside today's safe-to-spend
 * - tight: you can pay, and you'd still have something left to spend each day until the next baon
 * - short: you can pay, but it eats what you need until the next baon (bills included)
 * - no: you don't have that much spendable money
 */
export function affordCheck(input: {
  price: Centavos
  available: Centavos
  upcomingBills: Centavos
  spentToday: Centavos
  daysLeft: number
}): AffordResult {
  const { price, available, upcomingBills, spentToday, daysLeft } = input
  const safeBefore = safeToSpendToday({ available, upcomingBills, spentToday, daysLeft })
  const leftAfter = available - price
  const perDayAfter = Math.floor(Math.max(0, leftAfter - upcomingBills) / Math.max(1, daysLeft))
  let verdict: AffordVerdict
  if (price > available) verdict = 'no'
  else if (price <= safeBefore) verdict = 'easy'
  else if (perDayAfter > 0) verdict = 'tight'
  else verdict = 'short'
  return { verdict, safeBefore, safeAfter: perDayAfter, leftAfter: Math.max(0, leftAfter) }
}

/* ---------------- Round-up savings ---------------- */

/** How much to set aside so the expense rounds up to the next multiple of `to` pesos. */
export function roundUpAmount(amount: Centavos, toPesos: number): Centavos {
  const step = toPesos * 100
  if (step <= 0) return 0
  const rem = amount % step
  return rem === 0 ? 0 : step - rem
}

/* ---------------- Goal milestones ---------------- */

export const MILESTONES = [25, 50, 75, 100] as const

/** The highest milestone reached but not yet celebrated, if any. */
export function newMilestone(ratio: number, celebrated: readonly number[] = []): number | undefined {
  const pct = ratio * 100
  const reached = MILESTONES.filter((m) => pct >= m && !celebrated.includes(m))
  return reached.length ? reached[reached.length - 1] : undefined
}
