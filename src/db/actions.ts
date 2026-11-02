import { toISODate, today } from '@/domain/dates.ts'
import { advance } from '@/domain/recurring.ts'
import type { Recurring } from '@/domain/types.ts'
import { db, newId } from './db.ts'

/**
 * Log one occurrence of a bill or recurring income as a real transaction
 * (so the money actually leaves or enters the account) and move it to its next due date.
 */
export async function markPaid(r: Recurring): Promise<void> {
  const todayISO = toISODate(today())
  await db.transaction('rw', db.transactions, db.recurring, async () => {
    await db.transactions.add({
      id: newId(),
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
}

/** Skip one occurrence without logging money (e.g. a free month). */
export async function skipOnce(r: Recurring): Promise<void> {
  await db.recurring.update(r.id, { nextDue: advance(r.nextDue, r.frequency, r.anchorDay) })
}
