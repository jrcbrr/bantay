import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
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
import { seed } from './seed.ts'

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
    this.on('populate', (tx) => seed(tx))
  }
}

export const db = new BantayDB()

export const newId = (): string => crypto.randomUUID()
