import { addDays, daysBetween, fromISODate, toISODate } from './dates.ts'
import { occurrencesBefore } from './recurring.ts'
import type { Centavos, ISODate, Recurring, Transaction } from './types.ts'

/**
 * Average daily spending over the last `lookback` days (today excluded, since it's partial).
 * Bills logged from recurring items are left out: the forecast adds those on their due dates.
 */
export function spendingPace(txs: readonly Transaction[], today: Date, lookback = 30): Centavos {
  const from = toISODate(addDays(today, -lookback))
  const to = toISODate(today)
  const firstTx = txs.reduce<ISODate | null>((min, t) => (min === null || t.date < min ? t.date : min), null)
  if (!firstTx) return 0
  // If you only started tracking recently, average over the days you've actually tracked.
  const tracked = Math.min(lookback, Math.max(1, daysBetween(fromISODate(firstTx), today)))
  const spent = txs
    .filter((t) => t.type === 'expense' && !t.recurringId && t.date >= from && t.date < to)
    .reduce((s, t) => s + t.amount, 0)
  return Math.round(spent / tracked)
}

/** Average baon received per baon day, looking back `lookback` days. */
export function averageBaon(
  txs: readonly Transaction[],
  today: Date,
  baonDays: readonly number[],
  baonCategoryId = 'baon',
  lookback = 28,
): Centavos {
  const from = toISODate(addDays(today, -lookback))
  const to = toISODate(addDays(today, 1))
  const received = txs.filter(
    (t) => t.type === 'income' && t.categoryId === baonCategoryId && t.date >= from && t.date < to,
  )
  if (received.length === 0) return 0
  const daysWithBaon = new Set(received.map((t) => t.date)).size
  const total = received.reduce((s, t) => s + t.amount, 0)
  return baonDays.length === 0 ? 0 : Math.round(total / daysWithBaon)
}

export interface ForecastInput {
  startBalance: Centavos
  today: Date
  days: number
  dailySpend: Centavos
  baonPerDay: Centavos
  /** Weekdays baon arrives (0 = Sunday). */
  baonDays: readonly number[]
  recurring: readonly Recurring[]
}

export interface ForecastPoint {
  date: ISODate
  balance: Centavos
}

/**
 * Projects spendable balance day by day. Day 0 is today's actual balance; every later day
 * adds baon on baon days, subtracts the usual daily spending, and applies bills on their due dates.
 */
export function forecast(input: ForecastInput): ForecastPoint[] {
  const { startBalance, today, days, dailySpend, baonPerDay, baonDays, recurring } = input
  const end = toISODate(addDays(today, days + 1))
  const tomorrow = toISODate(addDays(today, 1))

  const billsByDay = new Map<ISODate, Centavos>()
  for (const o of occurrencesBefore(recurring, end)) {
    // Overdue items land tomorrow: they still need paying.
    const date = o.date < tomorrow ? tomorrow : o.date
    const signed = o.recurring.type === 'income' ? o.recurring.amount : o.recurring.type === 'expense' ? -o.recurring.amount : 0
    billsByDay.set(date, (billsByDay.get(date) ?? 0) + signed)
  }

  const points: ForecastPoint[] = [{ date: toISODate(today), balance: startBalance }]
  let balance = startBalance
  for (let i = 1; i <= days; i++) {
    const day = addDays(today, i)
    const iso = toISODate(day)
    if (baonDays.includes(day.getDay())) balance += baonPerDay
    balance -= dailySpend
    balance += billsByDay.get(iso) ?? 0
    points.push({ date: iso, balance })
  }
  return points
}

/** First day the forecast dips below zero, if any. */
export function firstShortfall(points: readonly ForecastPoint[]): ForecastPoint | undefined {
  return points.find((p) => p.balance < 0)
}
