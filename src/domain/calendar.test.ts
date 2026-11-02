import { describe, expect, it } from 'vitest'
import { dailyTotals, monthGrid, monthKey, monthTotals } from './calendar.ts'
import type { Transaction } from './types.ts'

describe('monthGrid', () => {
  it('November 2026 starts on Sunday: no leading blanks, 5 weeks', () => {
    const g = monthGrid(2026, 10)
    expect(g.length).toBe(5)
    expect(g[0]![0]).toBe('2026-11-01')
    expect(g[4]![1]).toBe('2026-11-30')
    expect(g[4]![2]).toBe(null)
  })

  it('pads leading days and supports Monday-first weeks', () => {
    // October 2026 starts on Thursday
    const sun = monthGrid(2026, 9)
    expect(sun[0]!.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01'])
    const mon = monthGrid(2026, 9, 1)
    expect(mon[0]!.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
  })

  it('every week has 7 cells', () => {
    for (let m = 0; m < 12; m++) for (const w of monthGrid(2027, m)) expect(w.length).toBe(7)
  })
})

const tx = (id: string, type: Transaction['type'], amount: number, date: string): Transaction => ({
  id,
  type,
  amount,
  date,
  accountId: 'cash',
  createdAt: 0,
})

const txs = [
  tx('a', 'income', 70000, '2026-11-02'),
  tx('b', 'expense', 18900, '2026-11-02'),
  tx('c', 'expense', 5000, '2026-11-02'),
  tx('d', 'transfer', 10000, '2026-11-02'),
  tx('e', 'expense', 2000, '2026-10-31'),
]

describe('totals', () => {
  it('sums income and expense per day, ignoring transfers', () => {
    expect(dailyTotals(txs).get('2026-11-02')).toEqual({ income: 70000, expense: 23900 })
    expect(dailyTotals(txs).get('2026-10-31')).toEqual({ income: 0, expense: 2000 })
  })

  it('sums a month', () => {
    expect(monthTotals(txs, monthKey(2026, 10))).toEqual({ income: 70000, expense: 23900 })
    expect(monthKey(2026, 0)).toBe('2026-01')
  })
})
