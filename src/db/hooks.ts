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

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY
}

export function useTransactions(): Transaction[] {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? EMPTY
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
