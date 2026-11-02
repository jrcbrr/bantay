import type { Lookups } from '@/db/hooks.ts'
import { fromISODate } from '@/domain/dates.ts'
import type { Transaction } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { TransactionRow } from './TransactionRow.tsx'

const dayFmt = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'long', day: 'numeric' })

/** Transactions grouped by day, each day with its net total. Expects newest-first input. */
export function TransactionGroups({ transactions, lookups }: { transactions: Transaction[]; lookups: Lookups }) {
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t])

  return (
    <div className="space-y-4">
      {[...groups].map(([date, txs]) => {
        const net = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0)
        return (
          <GlassCard key={date} className="p-2!">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <h2 className="text-xs font-semibold tracking-wide text-ink/50 uppercase dark:text-white/50">
                {dayFmt.format(fromISODate(date))}
              </h2>
              {net !== 0 && <Amount value={net} sign tone="auto" className="text-xs font-medium" />}
            </div>
            <ul>
              {txs.map((t) => (
                <TransactionRow key={t.id} tx={t} lookups={lookups} />
              ))}
            </ul>
          </GlassCard>
        )
      })}
    </div>
  )
}
