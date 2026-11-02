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
  /** Tile background color. */
  color?: string
  /** Lucide icon key (see ui/AccountIcon). */
  icon?: string
  /** User-uploaded image (small PNG data URL); overrides `icon` when set. */
  iconImage?: string
  /** Savings / locked money: counts toward net worth but not safe-to-spend. */
  savings?: boolean
  /** Credit cards: day of month the bill is due (1–31). */
  dueDay?: number
  /** Credit cards: credit limit. */
  creditLimit?: Centavos
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
  /** Sort position in pickers. */
  order?: number
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
  receiptId?: ID
  /** Event budget this spending counts toward. */
  eventId?: ID
  /** Set on the automatic round-up transfer, pointing at the expense it rounded. */
  roundUpOf?: ID
  /** For debt transactions: the original loan, or a repayment. */
  debtRole?: 'principal' | 'payment'
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

export type BudgetPeriod = 'weekly' | 'monthly'

export interface Budget {
  id: ID
  categoryId: ID
  limit: Centavos
  period: BudgetPeriod
}

export interface Goal {
  id: ID
  name: string
  target: Centavos
  /** When linked, progress is that account's balance. */
  accountId?: ID
  /** Manual progress, used when no account is linked. */
  saved: Centavos
  deadline?: ISODate
  color: string
  /** Milestones (25/50/75/100) already celebrated. */
  celebrated?: number[]
  createdAt: number
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
  /** Day of month the bill is anchored to (monthly/yearly), so Jan 31 → Feb 28 → Mar 31. */
  anchorDay?: number
  isSubscription?: boolean
  active: boolean
  createdAt: number
}

export type AssetKind = 'gadget' | 'vehicle' | 'collectible' | 'jewelry' | 'property' | 'other'

export interface Asset {
  id: ID
  name: string
  kind: AssetKind
  purchasePrice: Centavos
  currentValue: Centavos
  purchaseDate?: ISODate
  photo?: string
  note?: string
  createdAt: number
}

export interface Receipt {
  id: ID
  /** Compressed JPEG data URL. */
  image: string
  status: 'pending' | 'done'
  transactionId?: ID
  note?: string
  createdAt: number
}

export type DashboardCardId =
  | 'balance'
  | 'safe'
  | 'forecast'
  | 'flow'
  | 'insights'
  | 'budgets'
  | 'bills'
  | 'liquidity'
  | 'networth'
  | 'recent'

export interface DashboardCard {
  id: DashboardCardId
  hidden?: boolean
}

export interface Installment {
  id: ID
  label: string
  cardAccountId: ID
  total: Centavos
  months: number
  /** Date of the first monthly charge. */
  startDate: ISODate
  createdAt: number
}

export type DebtDirection = 'i_owe' | 'owed_to_me'

export interface Debt {
  id: ID
  person: string
  direction: DebtDirection
  principal: Centavos
  note?: string
  dueDate?: ISODate
  settled?: boolean
  createdAt: number
}

/** `days` = baon on specific weekdays only (e.g. school days Mon–Fri). */
export type AllowanceCycle = 'days' | 'daily' | 'weekly' | 'monthly'

export interface Settings {
  id: 'app'
  theme: 'system' | 'light' | 'dark'
  allowanceCycle: AllowanceCycle
  /** Weekdays you get baon on (0 = Sunday … 6 = Saturday), used when cycle is `days`. */
  allowanceDays: number[]
  /** 0 = Sunday … 6 = Saturday, used when cycle is weekly. */
  allowanceWeekday: number
  /** 1–28, used when cycle is monthly. */
  allowanceDayOfMonth: number
  /** Baon days you're not getting baon (holidays, no class). */
  skipBaonDates?: ISODate[]
  /** Round each expense up and move the difference to a savings account. */
  roundUp?: { toPesos: number; accountId: ID }
  /** Last time a backup file was downloaded (epoch ms). */
  lastBackupAt?: number
  /** Salt for the PIN hash. */
  pinSalt?: string
  /** Home dashboard order and visibility. */
  dashboard?: DashboardCard[]
  pinHash?: string
}

export interface WishItem {
  id: ID
  name: string
  price: Centavos
  /** 1 = must have, 2 = want, 3 = nice to have */
  priority: 1 | 2 | 3
  note?: string
  bought?: boolean
  createdAt: number
}
