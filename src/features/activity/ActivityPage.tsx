import { useTransactions } from '@/db/hooks.ts'
import { fromISODate } from '@/domain/dates.ts'
import type { Transaction } from '@/domain/types.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { TransactionRow } from './TransactionRow.tsx'

const dayFmt = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'long', day: 'numeric' })

export function ActivityPage() {
  const transactions = useTransactions()

  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t])

  return (
    <>
      <PageHeader title="Activity" subtitle="Everything you've logged" />
      {groups.size === 0 && (
        <GlassCard>
          <p className="py-6 text-center text-sm text-ink/50 dark:text-white/50">No transactions yet.</p>
        </GlassCard>
      )}
      <div className="space-y-4">
        {[...groups].map(([date, txs]) => (
          <GlassCard key={date} className="p-2!">
            <h2 className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-ink/50 uppercase dark:text-white/50">
              {dayFmt.format(fromISODate(date))}
            </h2>
            <ul>
              {txs.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </>
  )
}
