import { describe, expect, it } from 'vitest'
import { currentCycle } from './allowance.ts'
import { chargeDate, debtStatus, debtTotals, debtTxType, installmentStatus, monthlyCharge, nextCardDue } from './credit.ts'
import type { Debt, Installment, Transaction } from './types.ts'

describe('baon skip days', () => {
  const school = { cycle: 'days', weekday: 0, dayOfMonth: 1, days: [1, 2, 3, 4, 5] } as const
  it('skipping tomorrow stretches today’s baon', () => {
    const tue = new Date(2026, 10, 3, 9)
    expect(currentCycle(tue, { ...school, skip: ['2026-11-04'] })).toEqual({
      start: '2026-11-03',
      nextAllowance: '2026-11-05',
      daysLeft: 2,
    })
  })
  it('skipping today falls back to the last baon day', () => {
    const tue = new Date(2026, 10, 3, 9)
    expect(currentCycle(tue, { ...school, skip: ['2026-11-03'] }).start).toBe('2026-11-02')
  })
})

const inst: Installment = {
  id: 'i',
  label: 'Phone',
  cardAccountId: 'card',
  total: 1000000,
  months: 3,
  startDate: '2027-01-31',
  createdAt: 0,
}

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  type: 'expense',
  amount: 0,
  accountId: 'card',
  date: '2027-01-31',
  createdAt: 0,
  ...over,
})

describe('installments', () => {
  it('splits the total exactly, last month takes the remainder', () => {
    expect([0, 1, 2].map((i) => monthlyCharge(inst, i))).toEqual([333333, 333333, 333334])
  })

  it('keeps the charge day through short months', () => {
    expect([0, 1, 2].map((i) => chargeDate(inst, i))).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  })

  it('tracks progress from logged charges', () => {
    const s = installmentStatus(inst, [tx({ installmentId: 'i', amount: 333333 })])
    expect(s).toEqual({
      paidMonths: 1,
      paid: 333333,
      remaining: 666667,
      done: false,
      next: { date: '2027-02-28', amount: 333333, index: 1 },
    })
  })

  it('next card due date', () => {
    expect(nextCardDue(15, new Date(2026, 10, 3))).toBe('2026-11-15')
    expect(nextCardDue(1, new Date(2026, 10, 3))).toBe('2026-12-01')
    expect(nextCardDue(31, new Date(2026, 10, 3))).toBe('2026-11-30')
  })
})

describe('debts', () => {
  const lent: Debt = { id: 'd1', person: 'Mark', direction: 'owed_to_me', principal: 50000, createdAt: 0 }
  const borrowed: Debt = { id: 'd2', person: 'Ate', direction: 'i_owe', principal: 20000, createdAt: 0 }
  const txs = [
    tx({ debtId: 'd1', debtRole: 'principal', amount: 50000 }),
    tx({ debtId: 'd1', debtRole: 'payment', amount: 20000, type: 'income' }),
  ]

  it('counts only repayments', () => {
    expect(debtStatus(lent, txs)).toEqual({ repaid: 20000, remaining: 30000, ratio: 0.4 })
  })

  it('totals open debts each way', () => {
    expect(debtTotals([lent, borrowed, { ...borrowed, id: 'x', settled: true }], txs)).toEqual({ iOwe: 20000, owedToMe: 30000 })
  })

  it('money direction', () => {
    expect(debtTxType('i_owe', 'principal')).toBe('income')
    expect(debtTxType('i_owe', 'payment')).toBe('expense')
    expect(debtTxType('owed_to_me', 'principal')).toBe('expense')
    expect(debtTxType('owed_to_me', 'payment')).toBe('income')
  })
})
