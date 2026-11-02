import { effectOn } from './balance.ts'
import type { Account, Centavos, ID, Transaction } from './types.ts'

export interface YearArchive {
  /** The year as a string, e.g. "2025". */
  id: string
  year: number
  income: Centavos
  expense: Centavos
  count: number
  /** Spending per category id. */
  byCategory: Record<ID, Centavos>
  archivedAt: number
}

/** Transactions that must stay because something still points at them. */
export const keepWhenArchiving = (t: Transaction) => !!(t.debtId || t.installmentId)

export interface ArchivePlan {
  /** Transactions to remove. */
  remove: Transaction[]
  /** New opening balance per account, so every balance stays exactly the same. */
  openingBalances: Map<ID, Centavos>
  summaries: YearArchive[]
}

/**
 * Plan archiving everything before `beforeYear`. Removed transactions are folded into
 * each account's opening balance, so current balances don't change by a centavo.
 */
export function planArchive(
  accounts: readonly Account[],
  txs: readonly Transaction[],
  beforeYear: number,
  existing: readonly YearArchive[] = [],
  now = Date.now(),
): ArchivePlan {
  const cutoff = `${beforeYear}-01-01`
  const remove = txs.filter((t) => t.date < cutoff && !keepWhenArchiving(t))

  const openingBalances = new Map<ID, Centavos>(accounts.map((a) => [a.id, a.openingBalance]))
  for (const t of remove) {
    for (const id of [t.accountId, t.toAccountId]) {
      if (!id || !openingBalances.has(id)) continue
      if (id === t.toAccountId && id === t.accountId) continue
      openingBalances.set(id, openingBalances.get(id)! + effectOn(t, id))
    }
  }

  const byYear = new Map<number, YearArchive>()
  for (const e of existing) byYear.set(e.year, { ...e, byCategory: { ...e.byCategory } })
  for (const t of remove) {
    const year = Number(t.date.slice(0, 4))
    const a = byYear.get(year) ?? { id: String(year), year, income: 0, expense: 0, count: 0, byCategory: {}, archivedAt: now }
    a.count++
    a.archivedAt = now
    if (t.type === 'income') a.income += t.amount
    else if (t.type === 'expense') {
      a.expense += t.amount
      const k = t.categoryId ?? 'uncategorized'
      a.byCategory[k] = (a.byCategory[k] ?? 0) + t.amount
    }
    byYear.set(year, a)
  }

  return { remove, openingBalances, summaries: [...byYear.values()].sort((a, b) => a.year - b.year) }
}
