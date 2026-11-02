import type { ID, ISODate, Transaction, TransactionType } from './types.ts'

export interface TxFilter {
  /** Free text: matches note, category, account, or amount ("189", "1,250"). */
  query?: string
  type?: TransactionType | 'all'
  accountId?: ID
  categoryId?: ID
  /** Exact day. */
  date?: ISODate
  /** `YYYY-MM` */
  month?: string
}

export interface NameLookup {
  account: (id: ID) => string | undefined
  category: (id: ID) => string | undefined
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/** Amount as the user would type it: 18900 → "189", 125050 → "1250.5" */
function amountText(c: number): string {
  return String(c / 100)
}

export function matchesQuery(tx: Transaction, query: string, names: NameLookup): boolean {
  const q = norm(query.trim()).replace(/[₱,]/g, '')
  if (!q) return true
  const haystack = [
    tx.note ?? '',
    tx.categoryId ? (names.category(tx.categoryId) ?? '') : '',
    names.account(tx.accountId) ?? '',
    tx.toAccountId ? (names.account(tx.toAccountId) ?? '') : '',
    tx.type,
  ]
    .map(norm)
    .join(' ')
  // Match from the start of a word, so "cash" finds Cash but not GCash.
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`(^|[^a-z0-9])${escaped}`).test(haystack)) return true
  return /^\d+(\.\d+)?$/.test(q) && amountText(tx.amount).startsWith(q)
}

export function filterTransactions(
  txs: readonly Transaction[],
  f: TxFilter,
  names: NameLookup,
): Transaction[] {
  return txs.filter((tx) => {
    if (f.type && f.type !== 'all' && tx.type !== f.type) return false
    if (f.accountId && tx.accountId !== f.accountId && tx.toAccountId !== f.accountId) return false
    if (f.categoryId && tx.categoryId !== f.categoryId) return false
    if (f.date && tx.date !== f.date) return false
    if (f.month && !tx.date.startsWith(f.month)) return false
    if (f.query && !matchesQuery(tx, f.query, names)) return false
    return true
  })
}
