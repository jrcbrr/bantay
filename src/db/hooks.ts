import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { assetTotals } from '@/domain/assets.ts'
import { computeBalances, creditOwed, netWorth, totalAvailable, totalSavings } from '@/domain/balance.ts'
import { billsDueBefore } from '@/domain/recurring.ts'
import { currentCycle, safeToSpendToday } from '@/domain/allowance.ts'
import { toISODate, today } from '@/domain/dates.ts'
import type {
  Account,
  Asset,
  Budget,
  Category,
  Goal,
  Receipt,
  Recurring,
  Settings,
  Transaction,
} from '@/domain/types.ts'
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

export function useRecurring(): Recurring[] {
  return (
    useLiveQuery(async () => (await db.recurring.toArray()).sort((a, b) => a.nextDue.localeCompare(b.nextDue)), []) ??
    EMPTY
  )
}

export function useBudgets(): Budget[] {
  return useLiveQuery(() => db.budgets.toArray(), []) ?? EMPTY
}

export function useGoals(): Goal[] {
  return useLiveQuery(async () => (await db.goals.toArray()).sort((a, b) => a.createdAt - b.createdAt), []) ?? EMPTY
}

export function useAssets(): Asset[] {
  return useLiveQuery(async () => (await db.assets.toArray()).sort((a, b) => b.currentValue - a.currentValue), []) ?? EMPTY
}

export function usePendingReceipts(): Receipt[] {
  return (
    useLiveQuery(
      async () => (await db.receipts.where('status').equals('pending').toArray()).sort((a, b) => b.createdAt - a.createdAt),
      [],
    ) ?? EMPTY
  )
}

/** Weekdays baon arrives on, for the forecast. Monthly baon isn't weekday-based, so it's left out. */
export function baonWeekdays(settings: Settings | undefined): number[] {
  switch (settings?.allowanceCycle ?? 'days') {
    case 'days':
      return settings?.allowanceDays ?? [1, 2, 3, 4, 5]
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6]
    case 'weekly':
      return [settings?.allowanceWeekday ?? 1]
    case 'monthly':
      return []
  }
}

/** Balances, totals, safe-to-spend and everything else derived from your data. */
export function useMoney() {
  const accounts = useAccounts()
  const transactions = useTransactions()
  const settings = useSettings()
  const recurring = useRecurring()
  const assets = useAssets()

  return useMemo(() => {
    const balances = computeBalances(accounts, transactions)
    const available = totalAvailable(accounts, balances)
    const savings = totalSavings(accounts, balances)
    const owed = creditOwed(accounts, balances)
    const assetsValue = assetTotals(assets).value
    const worth = netWorth(accounts, balances, assetsValue)

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
    // Bills due before the next baon are set aside first.
    const upcomingBills = billsDueBefore(recurring, cycle.nextAllowance)
    const safeToday = safeToSpendToday({ available, upcomingBills, spentToday, daysLeft: cycle.daysLeft })

    return {
      accounts,
      transactions,
      recurring,
      assets,
      settings,
      balances,
      available,
      savings,
      owed,
      assetsValue,
      worth,
      spentToday,
      cycle,
      upcomingBills,
      safeToday,
    }
  }, [accounts, transactions, settings, recurring, assets])
}

export type Money = ReturnType<typeof useMoney>
