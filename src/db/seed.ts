import type { Transaction as DexieTx } from 'dexie'
import type { Account, Category, Settings, Template } from '@/domain/types.ts'

const now = Date.now()

export const defaultAccountLooks: Record<string, { icon: string; color: string }> = {
  cash: { icon: 'banknote', color: '#16a34a' },
  gcash: { icon: 'smartphone', color: '#0a5cff' },
}

const accounts: Account[] = [
  { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 0, ...defaultAccountLooks.cash!, createdAt: now },
  { id: 'gcash', name: 'GCash', kind: 'ewallet', openingBalance: 0, ...defaultAccountLooks.gcash!, createdAt: now },
]

const c = (id: string, name: string, kind: Category['kind'], icon: string, color: string): Category => ({
  id,
  name,
  kind,
  icon,
  color,
})

const categories: Category[] = [
  c('food', 'Food', 'expense', 'utensils', '#f59e0b'),
  c('transport', 'Transport', 'expense', 'bus', '#38bdf8'),
  c('school', 'School', 'expense', 'graduation-cap', '#a78bfa'),
  c('load', 'Load & Data', 'expense', 'wifi', '#22d3ee'),
  c('shopping', 'Shopping', 'expense', 'shopping-bag', '#f472b6'),
  c('fun', 'Fun', 'expense', 'gamepad-2', '#34d399'),
  c('subscriptions', 'Subscriptions', 'expense', 'repeat', '#818cf8'),
  c('other-exp', 'Other', 'expense', 'circle-ellipsis', '#94a3b8'),
  c('baon', 'Baon', 'income', 'hand-coins', '#2f6bff'),
  c('gift', 'Gift', 'income', 'gift', '#60a5fa'),
  c('other-inc', 'Other income', 'income', 'circle-plus', '#94a3b8'),
]

const templates: Template[] = [
  { id: 'tpl-baon', label: 'Baon', type: 'income', categoryId: 'baon', accountId: 'cash', pinned: true },
  { id: 'tpl-fare', label: 'Fare', type: 'expense', categoryId: 'transport', accountId: 'cash', pinned: true },
  { id: 'tpl-lunch', label: 'Lunch', type: 'expense', categoryId: 'food', accountId: 'cash', pinned: true },
]

const settings: Settings = {
  id: 'app',
  theme: 'system',
  allowanceCycle: 'days',
  allowanceDays: [1, 2, 3, 4, 5],
  allowanceWeekday: 1,
  allowanceDayOfMonth: 1,
}

/** Runs once, the first time the database is created on this device. */
export async function seed(tx: DexieTx): Promise<void> {
  await tx.table('accounts').bulkAdd(accounts)
  await tx.table('categories').bulkAdd(categories)
  await tx.table('templates').bulkAdd(templates)
  await tx.table('settings').add(settings)
}
