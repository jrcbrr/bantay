import { describe, expect, it } from 'vitest'
import { assetGain, assetGainRatio, assetTotals } from './assets.ts'
import { budgetProgress, flowBetween, periodRange } from './budgets.ts'
import { averageBaon, firstShortfall, forecast, spendingPace } from './forecast.ts'
import { advance, billsDueBefore, monthlyCost, occurrencesBefore } from './recurring.ts'
import type { Asset, Budget, Recurring, Transaction } from './types.ts'

// Tue 3 Nov 2026
const now = new Date(2026, 10, 3, 15)

const bill = (over: Partial<Recurring>): Recurring => ({
  id: 'r',
  label: 'Spotify',
  type: 'expense',
  amount: 14900,
  accountId: 'gcash',
  frequency: 'monthly',
  nextDue: '2026-11-10',
  active: true,
  createdAt: 0,
  ...over,
})

let n = 0
const tx = (over: Partial<Transaction>): Transaction => ({
  id: `t${n++}`,
  type: 'expense',
  amount: 10000,
  accountId: 'cash',
  date: '2026-11-02',
  createdAt: 0,
  ...over,
})

describe('advance', () => {
  it('steps daily, weekly, yearly', () => {
    expect(advance('2026-11-03', 'daily')).toBe('2026-11-04')
    expect(advance('2026-11-03', 'weekly')).toBe('2026-11-10')
    expect(advance('2026-11-03', 'yearly')).toBe('2027-11-03')
  })

  it('keeps the anchor day through short months', () => {
    expect(advance('2027-01-31', 'monthly', 31)).toBe('2027-02-28')
    expect(advance('2027-02-28', 'monthly', 31)).toBe('2027-03-31')
    expect(advance('2028-02-29', 'yearly', 29)).toBe('2029-02-28')
  })
})

describe('occurrences and bills', () => {
  it('lists every occurrence before a date, overdue included', () => {
    const weekly = bill({ frequency: 'weekly', nextDue: '2026-11-01', amount: 5000 })
    const dates = occurrencesBefore([weekly], '2026-11-20').map((o) => o.date)
    expect(dates).toEqual(['2026-11-01', '2026-11-08', '2026-11-15'])
  })

  it('skips paused items and counts only expenses as bills', () => {
    const paused = bill({ id: 'p', active: false, nextDue: '2026-11-04' })
    const allowance = bill({ id: 'i', type: 'income', nextDue: '2026-11-04' })
    const due = bill({ id: 'd', nextDue: '2026-11-04', amount: 9900 })
    expect(billsDueBefore([paused, allowance, due], '2026-11-05')).toBe(9900)
  })

  it('converts to a monthly cost', () => {
    expect(monthlyCost({ amount: 120000, frequency: 'yearly' })).toBe(10000)
    expect(monthlyCost({ amount: 1200, frequency: 'weekly' })).toBe(5200)
  })
})

describe('budgets', () => {
  it('weeks run Monday to Sunday; months are calendar months', () => {
    expect(periodRange(now, 'weekly')).toEqual({ start: '2026-11-02', end: '2026-11-09' })
    expect(periodRange(new Date(2026, 10, 8), 'weekly')).toEqual({ start: '2026-11-02', end: '2026-11-09' })
    expect(periodRange(now, 'monthly')).toEqual({ start: '2026-11-01', end: '2026-12-01' })
  })

  it('tracks spending in the category and period only', () => {
    const budget: Budget = { id: 'b', categoryId: 'food', limit: 50000, period: 'weekly' }
    const txs = [
      tx({ categoryId: 'food', amount: 18900, date: '2026-11-02' }),
      tx({ categoryId: 'food', amount: 22000, date: '2026-11-03' }),
      tx({ categoryId: 'food', amount: 99900, date: '2026-11-01' }), // last week
      tx({ categoryId: 'fun', amount: 30000, date: '2026-11-03' }),
      tx({ type: 'income', categoryId: 'food', amount: 5000, date: '2026-11-03' }),
    ]
    const p = budgetProgress(budget, txs, now)
    expect(p.spent).toBe(40900)
    expect(p.remaining).toBe(9100)
    expect(p.status).toBe('warning')
    expect(budgetProgress({ ...budget, limit: 30000 }, txs, now).status).toBe('over')
  })

  it('sums flow in a range without transfers', () => {
    const txs = [
      tx({ type: 'income', amount: 70000 }),
      tx({ amount: 20000 }),
      tx({ type: 'transfer', amount: 50000, toAccountId: 'gcash' }),
    ]
    expect(flowBetween(txs, { start: '2026-11-01', end: '2026-12-01' })).toEqual({ income: 70000, expense: 20000 })
  })
})

describe('forecast', () => {
  it('spending pace averages over tracked days and skips logged bills', () => {
    const txs = [
      tx({ amount: 30000, date: '2026-10-31' }),
      tx({ amount: 30000, date: '2026-11-01' }),
      tx({ amount: 99900, date: '2026-11-02', recurringId: 'r' }),
      tx({ amount: 50000, date: '2026-11-03' }), // today, excluded
    ]
    // tracking since Oct 31 → 3 days, ₱600 spent → ₱200/day
    expect(spendingPace(txs, now)).toBe(20000)
    expect(spendingPace([], now)).toBe(0)
  })

  it('average baon per baon day', () => {
    const txs = [
      tx({ type: 'income', categoryId: 'baon', amount: 15000, date: '2026-11-02' }),
      tx({ type: 'income', categoryId: 'baon', amount: 15000, date: '2026-11-03' }),
      tx({ type: 'income', categoryId: 'gift', amount: 100000, date: '2026-11-03' }),
    ]
    expect(averageBaon(txs, now, [1, 2, 3, 4, 5])).toBe(15000)
  })

  it('projects baon in, daily spend out, and bills on their due day', () => {
    const points = forecast({
      startBalance: 50000,
      today: now, // Tuesday
      days: 5,
      dailySpend: 10000,
      baonPerDay: 15000,
      baonDays: [1, 2, 3, 4, 5],
      recurring: [bill({ nextDue: '2026-11-06', amount: 14900 })],
    })
    expect(points.map((p) => p.date)).toEqual([
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ])
    // Wed +150 −100, Thu +150 −100, Fri +150 −100 −149, Sat −100, Sun −100
    expect(points.map((p) => p.balance)).toEqual([50000, 55000, 60000, 50100, 40100, 30100])
    expect(firstShortfall(points)).toBe(undefined)
  })

  it('finds the first day you would run out', () => {
    const points = forecast({
      startBalance: 15000,
      today: now,
      days: 3,
      dailySpend: 10000,
      baonPerDay: 0,
      baonDays: [],
      recurring: [],
    })
    expect(firstShortfall(points)?.date).toBe('2026-11-05')
  })
})

describe('assets', () => {
  const phone: Asset = { id: 'a', name: 'Phone', kind: 'gadget', purchasePrice: 1500000, currentValue: 900000, createdAt: 0 }
  const card: Asset = { id: 'b', name: 'Card', kind: 'collectible', purchasePrice: 100000, currentValue: 250000, createdAt: 0 }

  it('computes gain/loss and totals', () => {
    expect(assetGain(phone)).toBe(-600000)
    expect(assetGainRatio(card)).toBe(1.5)
    expect(assetTotals([phone, card])).toEqual({ value: 1150000, cost: 1600000, gain: -450000 })
  })
})
