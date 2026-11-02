import { describe, expect, it } from 'vitest'
import { planArchive } from './archive.ts'
import { computeBalances } from './balance.ts'
import { keywordFromNote, matchRule, type CategoryRule } from './rules.ts'
import type { Account, Transaction } from './types.ts'

const rule = (keyword: string, categoryId: string, createdAt = 0): CategoryRule => ({ id: keyword, keyword, categoryId, createdAt })

describe('category rules', () => {
  const rules = [rule('jollibee', 'food'), rule('milk tea', 'coffee'), rule('tea', 'snacks'), rule('ml', 'games'), rule('grab', 'transport')]

  it('matches whole words, case-insensitive', () => {
    expect(matchRule('Jollibee C1', rules)?.categoryId).toBe('food')
    expect(matchRule('html book', rules)).toBe(undefined)
    expect(matchRule('ML diamonds', rules)?.categoryId).toBe('games')
  })

  it('longest keyword wins', () => {
    expect(matchRule('Macao milk tea', rules)?.categoryId).toBe('coffee')
  })

  it('newer rule wins a tie', () => {
    expect(matchRule('grab', [...rules, rule('grab', 'food', 5)])?.categoryId).toBe('food')
  })

  it('learns short notes only', () => {
    expect(keywordFromNote('  Jollibee! ')).toBe('jollibee')
    expect(keywordFromNote('7-Eleven')).toBe('7-eleven')
    expect(keywordFromNote('189')).toBe(undefined)
    expect(keywordFromNote('bought a lot of things for the project with friends')).toBe(undefined)
  })
})

describe('archive', () => {
  const accounts: Account[] = [
    { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 10000, createdAt: 0 },
    { id: 'gcash', name: 'GCash', kind: 'ewallet', openingBalance: 0, createdAt: 0 },
  ]
  let n = 0
  const tx = (date: string, over: Partial<Transaction>): Transaction => ({
    id: `t${n++}`,
    type: 'expense',
    amount: 0,
    accountId: 'cash',
    date,
    createdAt: 0,
    ...over,
  })
  const txs = [
    tx('2025-03-01', { type: 'income', amount: 50000, categoryId: 'baon' }),
    tx('2025-03-02', { amount: 18900, categoryId: 'food' }),
    tx('2025-06-01', { type: 'transfer', amount: 10000, toAccountId: 'gcash' }),
    tx('2025-07-01', { amount: 5000, debtId: 'd' }), // linked to a debt: kept
    tx('2026-01-05', { amount: 3000, categoryId: 'food' }),
  ]

  it('keeps every balance exactly the same', () => {
    const plan = planArchive(accounts, txs, 2026, [], 1)
    const removed = new Set(plan.remove.map((t) => t.id))
    const after = accounts.map((a) => ({ ...a, openingBalance: plan.openingBalances.get(a.id)! }))
    expect(computeBalances(after, txs.filter((t) => !removed.has(t.id)))).toEqual(computeBalances(accounts, txs))
  })

  it('removes old transactions except linked ones, and summarizes the year', () => {
    const plan = planArchive(accounts, txs, 2026, [], 1)
    expect(plan.remove).toHaveLength(3)
    expect(plan.summaries).toEqual([
      { id: '2025', year: 2025, income: 50000, expense: 18900, count: 3, byCategory: { food: 18900 }, archivedAt: 1 },
    ])
  })

  it('adds to an existing summary when archiving again', () => {
    const first = planArchive(accounts, txs, 2026, [], 1).summaries
    const again = planArchive(accounts, [tx('2025-12-31', { amount: 100, categoryId: 'food' })], 2026, first, 2)
    expect(again.summaries[0]).toMatchObject({ expense: 19000, count: 4, byCategory: { food: 19000 } })
  })
})
