import { daysBetween, fromISODate, today } from '@/domain/dates.ts'

/** "Due today", "In 3 days", "2 days overdue", or a short date further out. */
export function dueLabel(nextDue: string): string {
  const d = daysBetween(today(), fromISODate(nextDue))
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} overdue`
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  if (d < 7) return `In ${d} days`
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(fromISODate(nextDue))
}
