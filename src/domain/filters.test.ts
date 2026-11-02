import { describe, expect, it } from 'vitest'
import { filterTransactions, type NameLookup } from './filters.ts'
import type { Transaction } from './types.ts'

const names: NameLookup = {
  account: (id) => ({ cash: 'Cash', gcash: 'GCash' })[id],
  category: (id) => ({ food: 'Meals', baon: 'Baon', coffee: 'Coffee & Milk Tea' })[id],
}

const base = { createdAt: 0 }
const txs: Transaction[] = [
  { ...base, id: 'a', type: 'income', amount: 70000, accountId: 'cash', categoryId: 'baon', date: '2026-11-02' },
  { ...base, id: 'b', type: 'expense', amount: 18900, accountId: 'cash', categoryId: 'food', note: 'McDo', date: '2026-11-02' },
  { ...base, id: 'c', type: 'expense', amount: 12000, accountId: 'gcash', categoryId: 'coffee', note: 'Macao Imperial', date: '2026-11-03' },
  { ...base, id: 'd', type: 'transfer', amount: 50000, accountId: 'gcash', toAccountId: 'cash', date: '2026-10-30' },
]

const ids = (list: Transaction[]) => list.map((t) => t.id)

describe('filterTransactions', () => {
  it('returns everything with an empty filter', () => {
    expect(ids(filterTransactions(txs, {}, names))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('searches notes case-insensitively', () => {
    expect(ids(filterTransactions(txs, { query: 'mcdo' }, names))).toEqual(['b'])
  })

  it('searches category and account names', () => {
    expect(ids(filterTransactions(txs, { query: 'milk tea' }, names))).toEqual(['c'])
    expect(ids(filterTransactions(txs, { query: 'gcash' }, names))).toEqual(['c', 'd'])
  })

  it('searches amounts as typed', () => {
    expect(ids(filterTransactions(txs, { query: '189' }, names))).toEqual(['b'])
    expect(ids(filterTransactions(txs, { query: '₱700' }, names))).toEqual(['a'])
  })

  it('filters by type, account (either side of a transfer), day and month', () => {
    expect(ids(filterTransactions(txs, { type: 'expense' }, names))).toEqual(['b', 'c'])
    expect(ids(filterTransactions(txs, { accountId: 'cash' }, names))).toEqual(['a', 'b', 'd'])
    expect(ids(filterTransactions(txs, { date: '2026-11-02' }, names))).toEqual(['a', 'b'])
    expect(ids(filterTransactions(txs, { month: '2026-10' }, names))).toEqual(['d'])
  })

  it('combines filters', () => {
    expect(ids(filterTransactions(txs, { type: 'expense', month: '2026-11', query: 'cash' }, names))).toEqual(['b'])
  })
})
