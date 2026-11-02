import { describe, expect, it } from 'vitest'
import {
  affordCheck,
  budgetHistory,
  challengeTotals,
  currentStep,
  daysToAfford,
  eventSpent,
  eventsOn,
  newMilestone,
  roundUpAmount,
  savingRate,
  stepAmount,
  type Challenge,
  type EventBudget,
} from './planExtras.ts'
import type { Budget, Transaction } from './types.ts'

let n = 0
const tx = (date: string, type: Transaction['type'], amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  type,
  amount,
  date,
  accountId: 'cash',
  createdAt: 0,
  ...extra,
})

describe('budget history', () => {
  it('lists current and past weeks, newest first', () => {
    const b: Budget = { id: 'b', categoryId: 'food', limit: 50000, period: 'weekly' }
    const txs = [
      tx('2026-11-03', 'expense', 20000, { categoryId: 'food' }),
      tx('2026-10-28', 'expense', 60000, { categoryId: 'food' }),
      tx('2026-10-28', 'expense', 9999, { categoryId: 'fun' }),
    ]
    const h = budgetHistory(b, txs, new Date(2026, 10, 3), 3)
    expect(h.map((p) => [p.start, p.spent])).toEqual([
      ['2026-11-02', 20000],
      ['2026-10-26', 60000],
      ['2026-10-19', 0],
    ])
  })

  it('monthly history crosses years', () => {
    const b: Budget = { id: 'b', categoryId: 'food', limit: 1, period: 'monthly' }
    expect(budgetHistory(b, [], new Date(2027, 0, 15), 2).map((p) => p.start)).toEqual(['2027-01-01', '2026-12-01'])
  })
})

describe('events', () => {
  const trip: EventBudget = { id: 'e', name: 'Field trip', limit: 100000, start: '2026-11-10', end: '2026-11-12', color: '#000', createdAt: 0 }
  it('only counts spending tagged to the event', () => {
    expect(eventSpent(trip, [tx('2026-11-10', 'expense', 500, { eventId: 'e' }), tx('2026-11-10', 'expense', 900)])).toBe(500)
  })
  it('is active within its dates, inclusive', () => {
    expect(eventsOn([trip], '2026-11-12')).toHaveLength(1)
    expect(eventsOn([trip], '2026-11-13')).toHaveLength(0)
  })
})

describe('ipon challenge', () => {
  const ch: Challenge = { id: 'c', name: '52', kind: 'weekly-52', amount: 1000, steps: 52, startDate: '2026-11-02', done: [0, 1, 51], createdAt: 0 }
  it('52-week saves n × base each week', () => {
    expect(stepAmount(ch, 0)).toBe(1000)
    expect(stepAmount(ch, 51)).toBe(52000)
    expect(challengeTotals(ch)).toEqual({ saved: 1000 + 2000 + 52000, target: 1378000, doneSteps: 3 })
  })
  it('finds the current step', () => {
    expect(currentStep(ch, new Date(2026, 10, 16))).toBe(2)
    expect(currentStep({ kind: 'daily', startDate: '2026-11-02', steps: 30 }, new Date(2026, 10, 3))).toBe(1)
    expect(currentStep({ kind: 'daily', startDate: '2026-11-02', steps: 30 }, new Date(2027, 0, 1))).toBe(29)
  })
})

describe('wishlist & afford', () => {
  it('saving rate over tracked days', () => {
    const txs = [tx('2026-11-01', 'income', 30000), tx('2026-11-02', 'expense', 6000), tx('2026-11-02', 'expense', 50000, { debtId: 'd' })]
    // 3 tracked days (Nov 1–3), net ₱240 → ₱80/day
    expect(savingRate(txs, new Date(2026, 10, 3))).toBe(8000)
  })

  it('days to afford', () => {
    expect(daysToAfford(100000, 40000, 10000)).toBe(6)
    expect(daysToAfford(100000, 150000, 0)).toBe(0)
    expect(daysToAfford(100000, 0, -500)).toBe(null)
  })

  const base = { available: 70000, upcomingBills: 0, spentToday: 0, daysLeft: 7 }
  it('easy when it fits today', () => {
    expect(affordCheck({ ...base, price: 8000 }).verdict).toBe('easy')
  })
  it('tight when it eats into later days', () => {
    const r = affordCheck({ ...base, price: 35000 })
    expect(r.verdict).toBe('tight')
    expect(r.safeAfter).toBe(5000)
    expect(r.leftAfter).toBe(35000)
  })
  it('short when bills would not be covered', () => {
    expect(affordCheck({ ...base, upcomingBills: 40000, price: 35000 }).verdict).toBe('short')
  })
  it('no when you do not have it', () => {
    expect(affordCheck({ ...base, price: 80000 }).verdict).toBe('no')
  })
})

describe('round-up and milestones', () => {
  it('rounds up to the next ₱10 / ₱50', () => {
    expect(roundUpAmount(18900, 10)).toBe(100)
    expect(roundUpAmount(18900, 50)).toBe(1100)
    expect(roundUpAmount(20000, 50)).toBe(0)
    expect(roundUpAmount(12350, 10)).toBe(650)
  })
  it('celebrates the highest new milestone once', () => {
    expect(newMilestone(0.2)).toBe(undefined)
    expect(newMilestone(0.6)).toBe(50)
    expect(newMilestone(0.6, [25, 50])).toBe(undefined)
    expect(newMilestone(1.1, [25])).toBe(100)
  })
})
