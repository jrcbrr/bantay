/** All money values are integer centavos (₱1.00 === 100). */
export type Centavos = number

/** ISO date string, `YYYY-MM-DD` (local date, no time). */
export type ISODate = string

export type ID = string

export type AccountKind = 'cash' | 'bank' | 'ewallet' | 'credit'

export interface Account {
  id: ID
  name: string
  kind: AccountKind
  /** Balance when the account was added to Bantay. Negative for credit card debt. */
  openingBalance: Centavos
  color?: string
  icon?: string
  archived?: boolean
  createdAt: number
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: ID
  name: string
  kind: CategoryKind
  icon: string
  color: string
  archived?: boolean
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: ID
  type: TransactionType
  /** Always positive; `type` decides direction. */
  amount: Centavos
  /** Source account (expense, transfer) or receiving account (income). */
  accountId: ID
  /** Destination account, transfers only. */
  toAccountId?: ID
  categoryId?: ID
  date: ISODate
  note?: string
  debtId?: ID
  installmentId?: ID
  recurringId?: ID
  createdAt: number
}

export interface Template {
  id: ID
  label: string
  type: TransactionType
  amount?: Centavos
  accountId?: ID
  toAccountId?: ID
  categoryId?: ID
  note?: string
  pinned?: boolean
}

export interface Budget {
  id: ID
  categoryId: ID
  /** Spending limit per allowance cycle. */
  limit: Centavos
}

export interface Goal {
  id: ID
  name: string
  target: Centavos
  accountId?: ID
  deadline?: ISODate
  saved: Centavos
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Recurring {
  id: ID
  label: string
  type: TransactionType
  amount: Centavos
  accountId: ID
  categoryId?: ID
  frequency: Frequency
  nextDue: ISODate
  isSubscription?: boolean
  active: boolean
}

export interface Installment {
  id: ID
  label: string
  cardAccountId: ID
  total: Centavos
  months: number
  startDate: ISODate
}

export type DebtDirection = 'i_owe' | 'owed_to_me'

export interface Debt {
  id: ID
  person: string
  direction: DebtDirection
  principal: Centavos
  note?: string
  settled?: boolean
  createdAt: number
}

export type AllowanceCycle = 'daily' | 'weekly' | 'monthly'

export interface Settings {
  id: 'app'
  theme: 'system' | 'light' | 'dark'
  allowanceCycle: AllowanceCycle
  /** 0 = Sunday … 6 = Saturday, used when cycle is weekly. */
  allowanceWeekday: number
  /** 1–28, used when cycle is monthly. */
  allowanceDayOfMonth: number
  pinHash?: string
}
