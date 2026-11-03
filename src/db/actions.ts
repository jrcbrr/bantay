import { toISODate, today } from '@/domain/dates.ts'
import { advance } from '@/domain/recurring.ts'
import { planArchive } from '@/domain/archive.ts'
import { debtStatus, installmentStatus } from '@/domain/credit.ts'
import type { Centavos, Debt, ISODate, Installment, Recurring } from '@/domain/types.ts'
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
// Tracking only: debts never move money in your accounts or change your net worth.

export interface NewDebt {
  person: string
  direction: Debt['direction']
  principal: Centavos
  note?: string
  dueDate?: ISODate
}

export async function createDebt(d: NewDebt): Promise<void> {
  await db.debts.add({ id: newId(), ...d, payments: [], createdAt: Date.now() })
}

/** Record a payback (either way). Settles the debt once it's fully paid. Returns an undo. */
export async function recordDebtPayment(debt: Debt, amount: Centavos): Promise<() => Promise<void>> {
  const payment = { id: newId(), amount, date: toISODate(today()) }
  const payments = [...(debt.payments ?? []), payment]
  const settled = debtStatus({ ...debt, payments }).remaining === 0
  await db.debts.update(debt.id, { payments, settled: settled || debt.settled })
  return async () => {
    await db.debts.update(debt.id, { payments: debt.payments ?? [], settled: debt.settled })
  }
}

export async function removeDebtPayment(debt: Debt, paymentId: string): Promise<void> {
  const payments = (debt.payments ?? []).filter((p) => p.id !== paymentId)
  await db.debts.update(debt.id, { payments, settled: debtStatus({ ...debt, payments }).remaining === 0 && debt.settled })
}

/** Delete a debt (and any account transactions older versions created for it). */
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
