import { describe, expect, it } from 'vitest'
import { currentCycle } from './allowance.ts'
import { chargeDate, debtStatus, debtTotals, debtTxType, installmentStatus, monthlyCharge, nextCardDue } from './credit.ts'
import { parseEntry, type NamedAccount, type NamedCategory } from './nlparse.ts'
import type { Debt, Installment, Transaction } from './types.ts'

const accounts: NamedAccount[] = [
  { id: 'cash', name: 'Cash' },
  { id: 'gcash', name: 'GCash' },
  { id: 'bpi', name: 'BPI' },
  { id: 'bpi-sav', name: 'BPI Savings' },
]
const categories: NamedCategory[] = [
  { id: 'food', name: 'Meals', kind: 'expense' },
  { id: 'coffee', name: 'Coffee & Milk Tea', kind: 'expense' },
  { id: 'transport', name: 'Transport', kind: 'expense' },
  { id: 'load', name: 'Load & Data', kind: 'expense' },
  { id: 'games', name: 'Games & Top-ups', kind: 'expense' },
  { id: 'baon', name: 'Baon', kind: 'income' },
  { id: 'gift', name: 'Gift / Pamasko', kind: 'income' },
  { id: 'relatives', name: 'From Relatives', kind: 'income' },
]
const p = (s: string) => parseEntry(s, accounts, categories)

describe('parseEntry', () => {
  it('mcdo 189 cash', () => {
    expect(p('mcdo 189 cash')).toEqual({ type: 'expense', amount: 18900, accountId: 'cash', categoryId: 'food', note: 'mcdo' })
  })

  it('keeps the original capitalization in the note', () => {
    expect(p('McDo 189 cash').note).toBe('McDo')
  })

  it('does not confuse GCash with Cash', () => {
    expect(p('milk tea 120 gcash')).toEqual({ type: 'expense', amount: 12000, accountId: 'gcash', categoryId: 'coffee', note: 'milk tea' })
  })

  it('baon is income', () => {
    expect(p('baon 150')).toEqual({ type: 'income', amount: 15000, categoryId: 'baon', note: 'baon' })
  })

  it('reads k amounts and yesterday', () => {
    expect(p('gift from tita 1.5k kahapon')).toMatchObject({ type: 'income', amount: 150000, dayOffset: -1 })
  })

  it('transfer between two accounts, in order', () => {
    expect(p('transfer 500 gcash to cash')).toEqual({ type: 'transfer', amount: 50000, accountId: 'gcash', toAccountId: 'cash' })
    expect(p('500 bpi to gcash')).toMatchObject({ type: 'transfer', accountId: 'bpi', toAccountId: 'gcash' })
  })

  it('prefers the longer account name', () => {
    expect(p('move 1000 bpi savings to bpi')).toMatchObject({ accountId: 'bpi-sav', toAccountId: 'bpi' })
  })

  it('cash in is a transfer into the wallet, not the Cash account', () => {
    expect(p('cash in 300 gcash')).toEqual({ type: 'transfer', amount: 30000, toAccountId: 'gcash' })
  })

  it('jeep fare and ML diamonds', () => {
    expect(p('jeep 13')).toMatchObject({ type: 'expense', amount: 1300, categoryId: 'transport' })
    expect(p('ml diamonds 99 gcash')).toMatchObject({ categoryId: 'games', accountId: 'gcash' })
  })

  it('unknown words become the note, defaulting to expense', () => {
    expect(p('random thing 45')).toEqual({ type: 'expense', amount: 4500, note: 'random thing' })
  })

  it('handles empty input', () => {
    expect(p('   ')).toEqual({})
  })
})

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
