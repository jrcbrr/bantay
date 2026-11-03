import { fromISODate, toISODate } from './dates.ts'
import type { Centavos, Debt, DebtPayment, ISODate, Installment, Transaction } from './types.ts'

/* ---------------- Installments ---------------- */

/** Monthly charge; the last month absorbs rounding so the total is exact. */
export function monthlyCharge(inst: Pick<Installment, 'total' | 'months'>, monthIndex = 0): Centavos {
  const base = Math.floor(inst.total / inst.months)
  return monthIndex === inst.months - 1 ? inst.total - base * (inst.months - 1) : base
}

/** Date of the n-th charge (0-based), same day of month as the start, clamped to short months. */
export function chargeDate(inst: Pick<Installment, 'startDate'>, n: number): ISODate {
  const s = fromISODate(inst.startDate)
  const day = s.getDate()
  const last = new Date(s.getFullYear(), s.getMonth() + n + 1, 0).getDate()
  return toISODate(new Date(s.getFullYear(), s.getMonth() + n, Math.min(day, last)))
}

export interface InstallmentStatus {
  paidMonths: number
  paid: Centavos
  remaining: Centavos
  done: boolean
  /** Next charge, if any. */
  next?: { date: ISODate; amount: Centavos; index: number }
}

/** Progress from the charges you've logged (transactions linked to the installment). */
export function installmentStatus(inst: Installment, txs: readonly Transaction[]): InstallmentStatus {
  const charges = txs.filter((t) => t.installmentId === inst.id)
  const paidMonths = Math.min(inst.months, charges.length)
  const paid = charges.reduce((s, t) => s + t.amount, 0)
  const done = paidMonths >= inst.months
  return {
    paidMonths,
    paid,
    remaining: Math.max(0, inst.total - paid),
    done,
    next: done ? undefined : { date: chargeDate(inst, paidMonths), amount: monthlyCharge(inst, paidMonths), index: paidMonths },
  }
}

/** Next due date for a card that's due on `dueDay` each month. */
export function nextCardDue(dueDay: number, now: Date): ISODate {
  const clamp = (y: number, m: number) => Math.min(dueDay, new Date(y, m + 1, 0).getDate())
  const y = now.getFullYear()
  const m = now.getMonth()
  const thisMonth = new Date(y, m, clamp(y, m))
  const today = new Date(y, m, now.getDate())
  if (thisMonth >= today) return toISODate(thisMonth)
  return toISODate(new Date(y, m + 1, clamp(y, m + 1)))
}

/* ---------------- Debts ---------------- */
// Debts are tracking only: they never change account balances or net worth.

export interface DebtStatus {
  repaid: Centavos
  remaining: Centavos
  ratio: number
}

export function debtStatus(debt: Debt): DebtStatus {
  const repaid = (debt.payments ?? []).reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, debt.principal - repaid)
  return { repaid, remaining, ratio: debt.principal > 0 ? Math.min(1, repaid / debt.principal) : 1 }
}

/** Totals across open debts. */
export function debtTotals(debts: readonly Debt[]): { iOwe: Centavos; owedToMe: Centavos } {
  let iOwe = 0
  let owedToMe = 0
  for (const d of debts) {
    if (d.settled) continue
    const r = debtStatus(d).remaining
    if (d.direction === 'i_owe') iOwe += r
    else owedToMe += r
  }
  return { iOwe, owedToMe }
}

/**
 * Older versions logged debts as account transactions. Turn their repayments into
 * debt payments, so those transactions can be removed and balances go back to normal.
 */
export function paymentsFromLegacy(debt: Debt, txs: readonly Transaction[]): DebtPayment[] {
  const legacy = txs
    .filter((t) => t.debtId === debt.id && t.debtRole === 'payment')
    .map((t) => ({ id: t.id, amount: t.amount, date: t.date }))
  const existing = debt.payments ?? []
  const known = new Set(existing.map((p) => p.id))
  return [...existing, ...legacy.filter((p) => !known.has(p.id))].sort((a, b) => a.date.localeCompare(b.date))
}
