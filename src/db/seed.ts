import type { Transaction as DexieTx } from 'dexie'
import type { Account, Category, DashboardCard, Settings, Template } from '@/domain/types.ts'

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

/** Default categories, in the order they appear in Quick Add. */
const categoryList: Omit<Category, 'order'>[] = [
  // Spending
  c('food', 'Meals', 'expense', 'utensils', '#f59e0b'),
  c('snacks', 'Snacks & Drinks', 'expense', 'cookie', '#fb923c'),
  c('coffee', 'Coffee & Milk Tea', 'expense', 'coffee', '#a16207'),
  c('groceries', 'Groceries', 'expense', 'shopping-basket', '#84cc16'),
  c('transport', 'Transport', 'expense', 'bus', '#38bdf8'),
  c('school', 'School Fees', 'expense', 'graduation-cap', '#a78bfa'),
  c('supplies', 'Books & Supplies', 'expense', 'book-open', '#8b5cf6'),
  c('printing', 'Projects & Printing', 'expense', 'printer', '#6366f1'),
  c('load', 'Load & Data', 'expense', 'wifi', '#22d3ee'),
  c('subscriptions', 'Subscriptions', 'expense', 'repeat', '#818cf8'),
  c('games', 'Games & Top-ups', 'expense', 'gamepad-2', '#34d399'),
  c('fun', 'Hangouts & Fun', 'expense', 'party-popper', '#10b981'),
  c('shopping', 'Shopping', 'expense', 'shopping-bag', '#f472b6'),
  c('clothes', 'Clothes', 'expense', 'shirt', '#ec4899'),
  c('personal', 'Personal Care', 'expense', 'sparkles', '#e879f9'),
  c('health', 'Health & Medicine', 'expense', 'pill', '#ef4444'),
  c('gifts-out', 'Gifts & Treats', 'expense', 'gift', '#f43f5e'),
  c('home', 'Home & Bills', 'expense', 'house', '#64748b'),
  c('donation', 'Church & Donations', 'expense', 'heart-handshake', '#0ea5e9'),
  c('other-exp', 'Other', 'expense', 'circle-ellipsis', '#94a3b8'),
  // Money in
  c('baon', 'Baon', 'income', 'hand-coins', '#16a34a'),
  c('gift', 'Gift / Pamasko', 'income', 'gift', '#22c55e'),
  c('relatives', 'From Relatives', 'income', 'users', '#4ade80'),
  c('scholarship', 'Scholarship & Stipend', 'income', 'award', '#059669'),
  c('sideline', 'Sideline & Commissions', 'income', 'briefcase', '#0d9488'),
  c('sold', 'Sold Something', 'income', 'tag', '#14b8a6'),
  c('refund', 'Refund', 'income', 'undo-2', '#2dd4bf'),
  c('other-inc', 'Other income', 'income', 'circle-plus', '#94a3b8'),
]

/** Used automatically by Debts & IOUs; hidden from pickers. */
const debtCategories: Omit<Category, 'order'>[] = [
  { ...c('borrowed', 'Borrowed', 'income', 'hand-coins', '#64748b'), archived: true },
  { ...c('debt-collect', 'Paid back to me', 'income', 'undo-2', '#64748b'), archived: true },
  { ...c('lent', 'Lent', 'expense', 'hand-coins', '#64748b'), archived: true },
  { ...c('debt-repay', 'Debt repayment', 'expense', 'undo-2', '#64748b'), archived: true },
]

export const defaultCategories: Category[] = [...categoryList, ...debtCategories].map((cat, i) => ({ ...cat, order: i }))
export const debtCategoryIds = debtCategories.map((cat) => cat.id)

const templates: Template[] = [
  { id: 'tpl-baon', label: 'Baon', type: 'income', categoryId: 'baon', accountId: 'cash', pinned: true },
  { id: 'tpl-fare', label: 'Fare', type: 'expense', categoryId: 'transport', accountId: 'cash', pinned: true },
  { id: 'tpl-lunch', label: 'Lunch', type: 'expense', categoryId: 'food', accountId: 'cash', pinned: true },
]

export const defaultDashboard: DashboardCard[] = [
  { id: 'balance' },
  { id: 'safe' },
  { id: 'forecast' },
  { id: 'flow' },
  { id: 'budgets' },
  { id: 'bills' },
  { id: 'liquidity' },
  { id: 'networth' },
  { id: 'recent' },
]

const settings: Settings = {
  id: 'app',
  theme: 'system',
  allowanceCycle: 'days',
  allowanceDays: [1, 2, 3, 4, 5],
  allowanceWeekday: 1,
  allowanceDayOfMonth: 1,
  dashboard: defaultDashboard,
}

/** Runs once, the first time the database is created on this device. */
export async function seed(tx: DexieTx): Promise<void> {
  await tx.table('accounts').bulkAdd(accounts)
  await tx.table('categories').bulkAdd(defaultCategories)
  await tx.table('templates').bulkAdd(templates)
  await tx.table('settings').add(settings)
}
