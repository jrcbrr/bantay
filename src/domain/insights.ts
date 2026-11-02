import { addDays, fromISODate, toISODate } from './dates.ts'
import type { Centavos, ID, ISODate, Transaction } from './types.ts'

export interface Period {
  /** Inclusive. */
  start: ISODate
  /** Exclusive. */
  end: ISODate
}

export function monthPeriod(year: number, month: number): Period {
  return { start: toISODate(new Date(year, month, 1)), end: toISODate(new Date(year, month + 1, 1)) }
}

export function yearPeriod(year: number): Period {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` }
}

/** The period right before this one, same length in months. */
export function previousPeriod(p: Period): Period {
  const s = fromISODate(p.start)
  const e = fromISODate(p.end)
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  return { start: toISODate(new Date(s.getFullYear(), s.getMonth() - months, 1)), end: p.start }
}

const inPeriod = (t: Transaction, p: Period) => t.date >= p.start && t.date < p.end

/** Everyday transactions: lending/borrowing money isn't income or spending. */
const everyday = (t: Transaction) => !t.debtId

export interface Recap {
  income: Centavos
  expense: Centavos
  /** income − expense */
  saved: Centavos
  /** saved / income, 0 when there's no income. */
  savingsRate: number
  count: number
  biggest?: Transaction
  topCategory?: { id: ID; amount: Centavos }
}

export function recap(txs: readonly Transaction[], p: Period): Recap {
  let income = 0
  let expense = 0
  let count = 0
  let biggest: Transaction | undefined
  const byCat = new Map<ID, Centavos>()
  for (const t of txs) {
    if (!inPeriod(t, p) || !everyday(t) || t.type === 'transfer') continue
    count++
    if (t.type === 'income') income += t.amount
    else {
      expense += t.amount
      if (!biggest || t.amount > biggest.amount) biggest = t
      const key = t.categoryId ?? 'uncategorized'
      byCat.set(key, (byCat.get(key) ?? 0) + t.amount)
    }
  }
  let topCategory: Recap['topCategory']
  for (const [id, amount] of byCat) if (!topCategory || amount > topCategory.amount) topCategory = { id, amount }
  const saved = income - expense
  return { income, expense, saved, savingsRate: income > 0 ? saved / income : 0, count, biggest, topCategory }
}

export interface CategoryShare {
  id: ID
  amount: Centavos
  share: number
}

/** Spending per category, biggest first. Uncategorized spending is grouped under `uncategorized`. */
export function spendingByCategory(txs: readonly Transaction[], p: Period): CategoryShare[] {
  const map = new Map<ID, Centavos>()
  let total = 0
  for (const t of txs) {
    if (t.type !== 'expense' || !inPeriod(t, p) || !everyday(t)) continue
    const key = t.categoryId ?? 'uncategorized'
    map.set(key, (map.get(key) ?? 0) + t.amount)
    total += t.amount
  }
  return [...map]
    .map(([id, amount]) => ({ id, amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export interface CategoryTrend {
  id: ID
  now: Centavos
  before: Centavos
  /** (now − before) / before; null when there was nothing before. */
  change: number | null
}

/** How each category moved compared with the previous period. Sorted by biggest swing in pesos. */
export function categoryTrends(txs: readonly Transaction[], p: Period): CategoryTrend[] {
  const now = new Map(spendingByCategory(txs, p).map((c) => [c.id, c.amount]))
  const before = new Map(spendingByCategory(txs, previousPeriod(p)).map((c) => [c.id, c.amount]))
  const ids = new Set([...now.keys(), ...before.keys()])
  return [...ids]
    .map((id) => {
      const n = now.get(id) ?? 0
      const b = before.get(id) ?? 0
      return { id, now: n, before: b, change: b > 0 ? (n - b) / b : null }
    })
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
}

/** Top N expenses in a period. */
export function biggestExpenses(txs: readonly Transaction[], p: Period, n = 10): Transaction[] {
  return txs
    .filter((t) => t.type === 'expense' && inPeriod(t, p) && everyday(t))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
}

export interface MonthTotals {
  month: string
  income: Centavos
  expense: Centavos
}

/** Income and spending for the `count` months ending with (and including) `year`/`month`. */
export function monthlyTotals(txs: readonly Transaction[], year: number, month: number, count = 6): MonthTotals[] {
  const out: MonthTotals[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const r = recap(txs, monthPeriod(d.getFullYear(), d.getMonth()))
    out.push({ month: toISODate(d).slice(0, 7), income: r.income, expense: r.expense })
  }
  return out
}

export interface DayTypeSpend {
  /** Average spending on baon (school) days that had any activity in the period. */
  baonDayAvg: Centavos
  otherDayAvg: Centavos
  baonDays: number
  otherDays: number
}

/** Average daily spending on baon days vs. the rest, counting every calendar day in range (up to `until`). */
export function spendByDayType(
  txs: readonly Transaction[],
  p: Period,
  baonWeekdays: readonly number[],
  until: ISODate,
): DayTypeSpend {
  const spent = new Map<ISODate, Centavos>()
  for (const t of txs) {
    if (t.type === 'expense' && inPeriod(t, p) && everyday(t)) spent.set(t.date, (spent.get(t.date) ?? 0) + t.amount)
  }
  const last = until < p.end ? until : p.end
  let baonTotal = 0
  let otherTotal = 0
  let baonDays = 0
  let otherDays = 0
  for (let d = fromISODate(p.start); toISODate(d) < last; d = addDays(d, 1)) {
    const amt = spent.get(toISODate(d)) ?? 0
    if (baonWeekdays.includes(d.getDay())) {
      baonDays++
      baonTotal += amt
    } else {
      otherDays++
      otherTotal += amt
    }
  }
  return {
    baonDayAvg: baonDays ? Math.round(baonTotal / baonDays) : 0,
    otherDayAvg: otherDays ? Math.round(otherTotal / otherDays) : 0,
    baonDays,
    otherDays,
  }
}

export interface WeekBaon {
  /** Monday of the week. */
  week: ISODate
  baon: Centavos
  spent: Centavos
}

/** Baon received and spending per week (Mon–Sun) for the last `count` weeks up to `today`. */
export function weeklyBaon(txs: readonly Transaction[], today: Date, count = 8, baonCategoryId = 'baon'): WeekBaon[] {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const out: WeekBaon[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = toISODate(addDays(monday, -7 * i))
    const end = toISODate(addDays(monday, -7 * i + 7))
    let baon = 0
    let spent = 0
    for (const t of txs) {
      if (t.date < start || t.date >= end || !everyday(t)) continue
      if (t.type === 'income' && t.categoryId === baonCategoryId) baon += t.amount
      else if (t.type === 'expense') spent += t.amount
    }
    out.push({ week: start, baon, spent })
  }
  return out
}

export interface Streaks {
  current: number
  longest: number
  /** Dates in the current streak window that counted. */
  lastSpendDate?: ISODate
}

/**
 * No-spend streaks: consecutive days with no spending other than the allowed categories
 * (fare by default, since you can't skip getting to school). Starts counting from the first
 * day you logged anything. Today only counts once it's over, unless you've already spent.
 */
export function noSpendStreaks(
  txs: readonly Transaction[],
  today: Date,
  allowedCategoryIds: readonly ID[] = ['transport'],
): Streaks {
  const spendDays = new Set<ISODate>()
  let first: ISODate | undefined
  for (const t of txs) {
    if (!first || t.date < first) first = t.date
    if (t.type === 'expense' && everyday(t) && !(t.categoryId && allowedCategoryIds.includes(t.categoryId)) && !t.recurringId)
      spendDays.add(t.date)
  }
  if (!first) return { current: 0, longest: 0 }

  const todayISO = toISODate(today)
  let longest = 0
  let run = 0
  for (let d = fromISODate(first); toISODate(d) < todayISO; d = addDays(d, 1)) {
    if (spendDays.has(toISODate(d))) run = 0
    else run++
    longest = Math.max(longest, run)
  }
  // Today extends the streak only if nothing's been spent yet (it may still be broken later).
  const current = spendDays.has(todayISO) ? 0 : run
  const lastSpend = [...spendDays].sort().pop()
  return { current, longest, lastSpendDate: lastSpend }
}
