import { describe, expect, it } from 'vitest'
import { computeBalances, netWorth, totalAvailable } from './balance.ts'
import type { Account, Transaction } from './types.ts'

const acct = (id: string, kind: Account['kind'], openingBalance = 0): Account => ({
  id,
  name: id,
  kind,
  openingBalance,
  createdAt: 0,
})

let n = 0
const tx = (t: Omit<Transaction, 'id' | 'createdAt' | 'date'>): Transaction => ({
  id: `t${n++}`,
  date: '2026-11-03',
  createdAt: 0,
  ...t,
})

describe('computeBalances', () => {
  const cash = acct('cash', 'cash', 20000)
  const gcash = acct('gcash', 'ewallet', 0)
  const card = acct('card', 'credit', -150000)

  it('adds baon to the account it was received in', () => {
    const b = computeBalances([cash, gcash], [tx({ type: 'income', amount: 50000, accountId: 'gcash' })])
    expect(b.get('gcash')).toBe(50000)
    expect(b.get('cash')).toBe(20000)
  })

  it('deducts spending from the account that paid', () => {
    const b = computeBalances([cash], [tx({ type: 'expense', amount: 18900, accountId: 'cash' })])
    expect(b.get('cash')).toBe(1100)
  })

  it('moves money on transfer without changing the total', () => {
    const txs = [tx({ type: 'transfer', amount: 5000, accountId: 'cash', toAccountId: 'gcash' })]
    const b = computeBalances([cash, gcash], txs)
    expect(b.get('cash')).toBe(15000)
    expect(b.get('gcash')).toBe(5000)
    expect(totalAvailable([cash, gcash], b)).toBe(20000)
  })

  it('excludes credit cards from available money but includes them in net worth', () => {
    const b = computeBalances([cash, card], [])
    expect(totalAvailable([cash, card], b)).toBe(20000)
    expect(netWorth([cash, card], b)).toBe(-130000)
  })

  it('ignores transactions for unknown accounts', () => {
    const b = computeBalances([cash], [tx({ type: 'expense', amount: 100, accountId: 'ghost' })])
    expect(b.get('cash')).toBe(20000)
    expect(b.has('ghost')).toBe(false)
  })
})
