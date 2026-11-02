import { toISODate, today } from '@/domain/dates.ts'
import { advance } from '@/domain/recurring.ts'
import { planArchive } from '@/domain/archive.ts'
import { debtCategory, debtStatus, debtTxType, installmentStatus } from '@/domain/credit.ts'
import type { Centavos, Debt, ID, ISODate, Installment, Recurring } from '@/domain/types.ts'
import { db, newId } from './db.ts'

/**
 * Log one occurrence of a bill or recurring income as a real transaction
 * (so the money actually leaves or enters the account) and move it to its next due date.
 */
export async function markPaid(r: Recurring): Promise<() => Promise<void>> {
  const todayISO = toISODate(today())
  const txId = newId()
  const previousDue = r.nextDue
  await db.transaction('rw', db.transactions, db.recurring, async () => {
    await db.transactions.add({
      id: txId,
      type: r.type,
      amount: r.amount,
      accountId: r.accountId,
      categoryId: r.categoryId,
      note: r.label,
      // Paying early or on time records today; future-dated payments aren't a thing here.
      date: todayISO,
      recurringId: r.id,
      createdAt: Date.now(),
    })
    await db.recurring.update(r.id, { nextDue: advance(r.nextDue, r.frequency, r.anchorDay) })
  })
  /** Undo: remove the logged payment and put the due date back. */
  return async () => {
    await db.transaction('rw', db.transactions, db.recurring, async () => {
      await db.transactions.delete(txId)
      await db.recurring.update(r.id, { nextDue: previousDue })
    })
  }
}

/** Skip one occurrence without logging money (e.g. a free month). */
export async function skipOnce(r: Recurring): Promise<void> {
  await db.recurring.update(r.id, { nextDue: advance(r.nextDue, r.frequency, r.anchorDay) })
}

/* ---------------- Debts & IOUs ---------------- */

export interface NewDebt {
  person: string
  direction: Debt['direction']
  principal: Centavos
  note?: string
  dueDate?: ISODate
  /** Record the money moving now (lent from / borrowed into this account). */
  accountId?: ID
}

const debtNote = (direction: Debt['direction'], role: 'principal' | 'payment', person: string) =>
  direction === 'i_owe'
    ? role === 'principal'
      ? `Borrowed from ${person}`
      : `Paid back ${person}`
    : role === 'principal'
      ? `Lent to ${person}`
      : `${person} paid me back`

export async function createDebt(d: NewDebt): Promise<void> {
  const id = newId()
  await db.transaction('rw', db.debts, db.transactions, async () => {
    await db.debts.add({
      id,
      person: d.person,
      direction: d.direction,
      principal: d.principal,
      note: d.note,
      dueDate: d.dueDate,
      createdAt: Date.now(),
    })
    if (d.accountId) {
      await db.transactions.add({
        id: newId(),
        type: debtTxType(d.direction, 'principal'),
        amount: d.principal,
        accountId: d.accountId,
        categoryId: debtCategory(d.direction, 'principal'),
        note: debtNote(d.direction, 'principal', d.person),
        date: toISODate(today()),
        debtId: id,
        debtRole: 'principal',
        createdAt: Date.now(),
      })
    }
  })
}

/** Log a repayment (either way) and settle the debt once it's fully paid. */
export async function recordDebtPayment(debt: Debt, amount: Centavos, accountId: ID): Promise<void> {
  await db.transaction('rw', db.debts, db.transactions, async () => {
    await db.transactions.add({
      id: newId(),
      type: debtTxType(debt.direction, 'payment'),
      amount,
      accountId,
      categoryId: debtCategory(debt.direction, 'payment'),
      note: debtNote(debt.direction, 'payment', debt.person),
      date: toISODate(today()),
      debtId: debt.id,
      debtRole: 'payment',
      createdAt: Date.now(),
    })
    const txs = await db.transactions.where('debtId').equals(debt.id).toArray()
    if (debtStatus(debt, txs).remaining === 0) await db.debts.update(debt.id, { settled: true })
  })
}

/** Delete a debt and the transactions it created, so balances go back to how they were. */
export async function deleteDebt(debt: Debt): Promise<void> {
  await db.transaction('rw', db.debts, db.transactions, async () => {
    await db.transactions.where('debtId').equals(debt.id).delete()
    await db.debts.delete(debt.id)
  })
}

/* ---------------- Installments ---------------- */

/** Log the next monthly installment charge on the card. */
export async function logInstallmentCharge(inst: Installment): Promise<void> {
  const txs = await db.transactions.where('installmentId').equals(inst.id).toArray()
  const status = installmentStatus(inst, txs)
  if (!status.next) return
  const todayISO = toISODate(today())
  await db.transactions.add({
    id: newId(),
    type: 'expense',
    amount: status.next.amount,
    accountId: inst.cardAccountId,
    note: `${inst.label} (${status.next.index + 1}/${inst.months})`,
    date: status.next.date < todayISO ? status.next.date : todayISO,
    installmentId: inst.id,
    createdAt: Date.now(),
  })
}

/** Delete an installment plan. Charges already logged stay as normal card transactions. */
export async function deleteInstallment(inst: Installment): Promise<void> {
  await db.transaction('rw', db.installments, db.transactions, async () => {
    await db.transactions.where('installmentId').equals(inst.id).modify((t) => {
      delete t.installmentId
    })
    await db.installments.delete(inst.id)
  })
}

/* ---------------- Archive old years ---------------- */

/**
 * Fold every transaction before `beforeYear` into account opening balances and a yearly summary.
 * Balances stay identical. Receipts of archived transactions are removed (they're in your backup).
 * Returns how many transactions were archived.
 */
export async function archiveBefore(beforeYear: number): Promise<number> {
  let count = 0
  await db.transaction('rw', [db.accounts, db.transactions, db.receipts, db.archives], async () => {
    const [accounts, txs, existing] = await Promise.all([db.accounts.toArray(), db.transactions.toArray(), db.archives.toArray()])
    const plan = planArchive(accounts, txs, beforeYear, existing)
    for (const a of accounts) {
      const next = plan.openingBalances.get(a.id)
      if (next !== undefined && next !== a.openingBalance) await db.accounts.update(a.id, { openingBalance: next })
    }
    const receiptIds = plan.remove.map((t) => t.receiptId).filter((id): id is string => !!id)
    await db.receipts.bulkDelete(receiptIds)
    await db.transactions.bulkDelete(plan.remove.map((t) => t.id))
    await db.archives.bulkPut(plan.summaries)
    count = plan.remove.length
  })
  return count
}
