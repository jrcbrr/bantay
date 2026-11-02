import { addDays, daysBetween, toISODate } from './dates.ts'
import type { AllowanceCycle, Centavos, ISODate } from './types.ts'

export interface CycleConfig {
  cycle: AllowanceCycle
  /** 0 = Sunday … 6 = Saturday (weekly). */
  weekday: number
  /** 1–28 (monthly). */
  dayOfMonth: number
}

export interface CycleWindow {
  /** First day of the current baon cycle (inclusive). */
  start: ISODate
  /** Day the next baon arrives (exclusive end of this cycle). */
  nextAllowance: ISODate
  /** Days left including today. Always ≥ 1. */
  daysLeft: number
}

/** Which baon cycle `now` falls in. */
export function currentCycle(now: Date, cfg: CycleConfig): CycleWindow {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date
  let next: Date

  switch (cfg.cycle) {
    case 'daily':
      start = day
      next = addDays(day, 1)
      break
    case 'weekly': {
      const back = (day.getDay() - cfg.weekday + 7) % 7
      start = addDays(day, -back)
      next = addDays(start, 7)
      break
    }
    case 'monthly': {
      const dom = Math.min(Math.max(cfg.dayOfMonth, 1), 28)
      start = new Date(day.getFullYear(), day.getMonth(), dom)
      if (start > day) start = new Date(day.getFullYear(), day.getMonth() - 1, dom)
      next = new Date(start.getFullYear(), start.getMonth() + 1, dom)
      break
    }
  }

  return {
    start: toISODate(start),
    nextAllowance: toISODate(next),
    daysLeft: Math.max(1, daysBetween(day, next)),
  }
}

export interface SafeToSpendInput {
  /** Spendable money right now (cash + banks + e-wallets). */
  available: Centavos
  /** Bills/subscriptions due before the next baon that aren't paid yet. */
  upcomingBills: Centavos
  /** Already spent today (so today's figure shrinks as you spend). */
  spentToday: Centavos
  daysLeft: number
}

/**
 * How much you can spend today and still make it to the next baon.
 * Spreads what's left (after upcoming bills) evenly across the remaining days.
 */
export function safeToSpendToday(input: SafeToSpendInput): Centavos {
  const { available, upcomingBills, spentToday, daysLeft } = input
  // `available` already has today's spending removed; add it back to get the start-of-day pool.
  const pool = available + spentToday - upcomingBills
  if (pool <= 0) return 0
  const perDay = Math.floor(pool / Math.max(1, daysLeft))
  return Math.max(0, perDay - spentToday)
}
