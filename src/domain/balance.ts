import type { Account, Centavos, ID, Transaction } from './types.ts'

/** Signed effect of a single transaction on one account. */
export function effectOn(tx: Transaction, accountId: ID): Centavos {
  switch (tx.type) {
    case 'income':
      return tx.accountId === accountId ? tx.amount : 0
    case 'expense':
      return tx.accountId === accountId ? -tx.amount : 0
    case 'transfer': {
      let delta = 0
      if (tx.accountId === accountId) delta -= tx.amount
      if (tx.toAccountId === accountId) delta += tx.amount
      return delta
    }
  }
}

/**
 * Current balance of every account: opening balance + every transaction's effect.
 * Spending deducts from the paying account, income adds, transfers move money.
 */
export function computeBalances(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): Map<ID, Centavos> {
  const balances = new Map<ID, Centavos>()
  for (const a of accounts) balances.set(a.id, a.openingBalance)

  for (const tx of transactions) {
    const from = balances.get(tx.accountId)
    if (from !== undefined) balances.set(tx.accountId, from + effectOn(tx, tx.accountId))
    if (tx.type === 'transfer' && tx.toAccountId && tx.toAccountId !== tx.accountId) {
      const to = balances.get(tx.toAccountId)
      if (to !== undefined) balances.set(tx.toAccountId, to + effectOn(tx, tx.toAccountId))
    }
  }
  return balances
}

/** Money you can spend now: cash, e-wallets and banks not marked as savings. */
export function isSpendable(a: Account): boolean {
  return !a.archived && a.kind !== 'credit' && !a.savings
}

function sumWhere(accounts: readonly Account[], balances: Map<ID, Centavos>, pred: (a: Account) => boolean) {
  return accounts.filter((a) => !a.archived && pred(a)).reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0)
}

/** Spendable money right now. Feeds safe-to-spend. */
export function totalAvailable(accounts: readonly Account[], balances: Map<ID, Centavos>): Centavos {
  return sumWhere(accounts, balances, isSpendable)
}

/** Money set aside in savings accounts. */
export function totalSavings(accounts: readonly Account[], balances: Map<ID, Centavos>): Centavos {
  return sumWhere(accounts, balances, (a) => a.kind !== 'credit' && !!a.savings)
}

/** What's owed on credit cards, as a positive number. */
export function creditOwed(accounts: readonly Account[], balances: Map<ID, Centavos>): Centavos {
  return -sumWhere(accounts, balances, (a) => a.kind === 'credit')
}

/** Net worth: every balance (credit cards are negative) plus asset values. */
export function netWorth(accounts: readonly Account[], balances: Map<ID, Centavos>, assetsValue: Centavos = 0): Centavos {
  return sumWhere(accounts, balances, () => true) + assetsValue
}
