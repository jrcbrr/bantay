import { describe, expect, it } from 'vitest'
import {
  biggestExpenses,
  categoryTrends,
  monthPeriod,
  monthlyTotals,
  noSpendStreaks,
  previousPeriod,
  recap,
  spendByDayType,
  spendingByCategory,
  weeklyBaon,
  yearPeriod,
} from './insights.ts'
import type { Transaction } from './types.ts'

let n = 0
const tx = (date: string, type: Transaction['type'], amount: number, categoryId?: string, extra: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  type,
  amount,
  date,
  categoryId,
  accountId: 'cash',
  createdAt: 0,
  ...extra,
})

const nov = monthPeriod(2026, 10)

const txs = [
  tx('2026-10-05', 'expense', 10000, 'coffee'),
  tx('2026-10-06', 'expense', 20000, 'food'),
  tx('2026-11-02', 'income', 75000, 'baon'),
  tx('2026-11-02', 'expense', 18900, 'food'),
  tx('2026-11-03', 'expense', 15000, 'coffee'),
  tx('2026-11-03', 'expense', 1300, 'transport'),
  tx('2026-11-04', 'expense', 50000, 'lent', { debtId: 'd' }), // lending isn't spending
  tx('2026-11-04', 'transfer', 30000),
]

describe('periods', () => {
  it('month, year and previous', () => {
    expect(nov).toEqual({ start: '2026-11-01', end: '2026-12-01' })
    expect(previousPeriod(nov)).toEqual({ start: '2026-10-01', end: '2026-11-01' })
    expect(previousPeriod(yearPeriod(2026))).toEqual({ start: '2025-01-01', end: '2026-01-01' })
    expect(previousPeriod(monthPeriod(2026, 0))).toEqual({ start: '2025-12-01', end: '2026-01-01' })
  })
})

describe('recap', () => {
  it('sums the period, skipping transfers and lending', () => {
    const r = recap(txs, nov)
    expect(r.income).toBe(75000)
    expect(r.expense).toBe(35200)
    expect(r.saved).toBe(39800)
    expect(Math.round(r.savingsRate * 100)).toBe(53)
    expect(r.biggest?.amount).toBe(18900)
    expect(r.topCategory).toEqual({ id: 'food', amount: 18900 })
  })
})

describe('categories', () => {
  it('shares sum to 1, biggest first', () => {
    const s = spendingByCategory(txs, nov)
    expect(s.map((c) => c.id)).toEqual(['food', 'coffee', 'transport'])
    expect(Math.round(s.reduce((a, c) => a + c.share, 0) * 1000)).toBe(1000)
  })

  it('compares with the previous month', () => {
    const t = categoryTrends(txs, nov)
    const coffee = t.find((c) => c.id === 'coffee')!
    expect(coffee).toEqual({ id: 'coffee', now: 15000, before: 10000, change: 0.5 })
    expect(t.find((c) => c.id === 'transport')!.change).toBe(null)
  })

  it('biggest expenses', () => {
    expect(biggestExpenses(txs, nov, 2).map((t) => t.amount)).toEqual([18900, 15000])
  })

  it('monthly totals', () => {
    expect(monthlyTotals(txs, 2026, 10, 2)).toEqual([
      { month: '2026-10', income: 0, expense: 30000 },
      { month: '2026-11', income: 75000, expense: 35200 },
    ])
  })
})

describe('baon', () => {
  it('school days vs other days', () => {
    // Nov 1 (Sun) .. Nov 3 (Tue): Mon 189, Tue 163, Sun 0
    const r = spendByDayType(txs, nov, [1, 2, 3, 4, 5], '2026-11-04')
    expect(r).toEqual({ baonDayAvg: 17600, otherDayAvg: 0, baonDays: 2, otherDays: 1 })
  })

  it('weekly baon vs spending', () => {
    const w = weeklyBaon(txs, new Date(2026, 10, 4), 2)
    expect(w).toEqual([
      { week: '2026-10-26', baon: 0, spent: 0 },
      { week: '2026-11-02', baon: 75000, spent: 35200 },
    ])
  })
})

describe('no-spend streaks', () => {
  it('fare does not break a streak, other spending does', () => {
    const list = [
      tx('2026-11-01', 'expense', 5000, 'food'),
      tx('2026-11-02', 'expense', 1300, 'transport'),
      tx('2026-11-03', 'income', 15000, 'baon'),
    ]
    // Nov 2, 3, 4 clean; today Nov 5 nothing yet
    expect(noSpendStreaks(list, new Date(2026, 10, 5))).toMatchObject({ current: 3, longest: 3 })
  })

  it('spending today resets the current streak', () => {
    const list = [tx('2026-11-01', 'income', 100, 'baon'), tx('2026-11-04', 'expense', 100, 'food')]
    expect(noSpendStreaks(list, new Date(2026, 10, 4))).toMatchObject({ current: 0, longest: 3 })
  })

  it('no data, no streak', () => {
    expect(noSpendStreaks([], new Date())).toEqual({ current: 0, longest: 0 })
  })
})
