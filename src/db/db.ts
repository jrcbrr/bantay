import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
  Asset,
  Receipt,
  Budget,
  Category,
  Debt,
  Goal,
  Installment,
  Recurring,
  Settings,
  Template,
  Transaction,
} from '@/domain/types.ts'
import { debtCategoryIds, defaultAccountLooks, defaultCategories, defaultDashboard, seed } from './seed.ts'

export class BantayDB extends Dexie {
  declare accounts: EntityTable<Account, 'id'>
  declare categories: EntityTable<Category, 'id'>
  declare transactions: EntityTable<Transaction, 'id'>
  declare templates: EntityTable<Template, 'id'>
  declare budgets: EntityTable<Budget, 'id'>
  declare goals: EntityTable<Goal, 'id'>
  declare recurring: EntityTable<Recurring, 'id'>
  declare installments: EntityTable<Installment, 'id'>
  declare debts: EntityTable<Debt, 'id'>
  declare settings: EntityTable<Settings, 'id'>
  declare assets: EntityTable<Asset, 'id'>
  declare receipts: EntityTable<Receipt, 'id'>

  constructor(name = 'bantay') {
    super(name)
    this.version(1).stores({
      accounts: 'id, kind, archived',
      categories: 'id, kind',
      transactions: 'id, date, type, accountId, toAccountId, categoryId, debtId, installmentId',
      templates: 'id, pinned',
      budgets: 'id, &categoryId',
      goals: 'id',
      recurring: 'id, nextDue, active',
      installments: 'id, cardAccountId',
      debts: 'id, settled',
      settings: 'id',
    })
    // v2: school-day baon cycle + account icons for existing installs.
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('settings')
          .toCollection()
          .modify((s: Settings) => {
            s.allowanceCycle = 'days'
            s.allowanceDays = [1, 2, 3, 4, 5]
          })
        await tx
          .table('accounts')
          .toCollection()
          .modify((a: Account) => {
            const preset = defaultAccountLooks[a.id]
            if (preset) {
              a.icon = preset.icon
              a.color = preset.color
            }
          })
      })
    // v3: bigger default category set. Adds new ones, refreshes order/look of defaults,
    // leaves any categories you created untouched.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const table = tx.table<Category, string>('categories')
        for (const cat of defaultCategories) {
          const existing = await table.get(cat.id)
          await table.put(existing ? { ...existing, ...cat } : cat)
        }
      })
    // v4: assets, receipts inbox, budget periods, dashboard layout.
    this.version(4)
      .stores({
        assets: 'id, kind',
        receipts: 'id, status, createdAt',
        transactions: 'id, date, type, accountId, toAccountId, categoryId, debtId, installmentId, receiptId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('settings')
          .toCollection()
          .modify((s: Settings) => {
            s.dashboard ??= defaultDashboard
          })
      })
    // v5: debts & installments get indexes on transactions; debt categories added.
    this.version(5)
      .stores({
        transactions:
          'id, date, type, accountId, toAccountId, categoryId, debtId, installmentId, receiptId, recurringId',
        installments: 'id, cardAccountId, createdAt',
        debts: 'id, settled, createdAt',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Category, string>('categories')
        for (const cat of defaultCategories.filter((c) => debtCategoryIds.includes(c.id))) {
          if (!(await table.get(cat.id))) await table.add(cat)
        }
      })
    this.on('populate', (tx) => seed(tx))
  }
}

export const db = new BantayDB()

export const newId = (): string => crypto.randomUUID()
