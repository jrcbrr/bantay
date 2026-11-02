import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { computeBalances, totalAvailable } from '@/domain/balance.ts'
import { currentCycle, safeToSpendToday } from '@/domain/allowance.ts'
import { toISODate, today } from '@/domain/dates.ts'
import type { Account, Category, Settings, Transaction } from '@/domain/types.ts'
import { db } from './db.ts'

const EMPTY: never[] = []

export function useAccounts(): Account[] {
  return useLiveQuery(() => db.accounts.filter((a) => !a.archived).toArray(), []) ?? EMPTY
}

/** Every account and category, archived ones included, for showing names on old transactions. */
export function useLookups() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? EMPTY
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY
  return useMemo(
    () => ({
      accounts: new Map<string, Account>(accounts.map((a) => [a.id, a])),
      categories: new Map<string, Category>(categories.map((c) => [c.id, c])),
    }),
    [accounts, categories],
  )
}

export type Lookups = ReturnType<typeof useLookups>

export function useCategories(): Category[] {
  return (
    useLiveQuery(
      async () =>
        (await db.categories.toArray())
          .filter((c) => !c.archived)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
      [],
    ) ?? EMPTY
  )
}

export function useTransactions(): Transaction[] {
  return (
    useLiveQuery(
      async () =>
        (await db.transactions.toArray()).sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
        ),
      [],
    ) ?? EMPTY
  )
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('app'), [])
}

/** Balances per account plus the totals the home screen needs. */
export function useMoney() {
  const accounts = useAccounts()
  const transactions = useTransactions()
  const settings = useSettings()

  return useMemo(() => {
    const balances = computeBalances(accounts, transactions)
    const available = totalAvailable(accounts, balances)
    const todayISO = toISODate(today())
    const spentToday = transactions
      .filter((t) => t.type === 'expense' && t.date === todayISO)
      .reduce((s, t) => s + t.amount, 0)
    const cycle = currentCycle(new Date(), {
      cycle: settings?.allowanceCycle ?? 'days',
      weekday: settings?.allowanceWeekday ?? 1,
      dayOfMonth: settings?.allowanceDayOfMonth ?? 1,
      days: settings?.allowanceDays ?? [1, 2, 3, 4, 5],
    })
    const safeToday = safeToSpendToday({
      available,
      upcomingBills: 0, // wired up in the Planning milestone
      spentToday,
      daysLeft: cycle.daysLeft,
    })
    return { accounts, transactions, balances, available, spentToday, cycle, safeToday }
  }, [accounts, transactions, settings])
}
