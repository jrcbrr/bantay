import { addDays, daysBetween, toISODate } from './dates.ts'
import type { AllowanceCycle, Centavos, ISODate } from './types.ts'

export interface CycleConfig {
  cycle: AllowanceCycle
  /** 0 = Sunday … 6 = Saturday (weekly). */
  weekday: number
  /** 1–28 (monthly). */
  dayOfMonth: number
  /** Baon weekdays, 0 = Sunday … 6 = Saturday (days). Empty means every day. */
  days?: readonly number[]
  /** Specific dates with no baon (holidays, no class), `days` cycle only. */
  skip?: readonly ISODate[]
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
    case 'days': {
      // e.g. school days: baon Mon–Fri, so Friday's baon has to last through Sunday.
      const days = cfg.days?.length ? cfg.days : [0, 1, 2, 3, 4, 5, 6]
      const isBaonDay = (d: Date) => days.includes(d.getDay()) && !cfg.skip?.includes(toISODate(d))
      let back = 0
      while (back < 14 && !isBaonDay(addDays(day, -back))) back++
      let fwd = 1
      while (fwd < 14 && !isBaonDay(addDays(day, fwd))) fwd++
      start = addDays(day, -back)
      next = addDays(day, fwd)
      break
    }
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
