import { Link } from 'react-router'
import { ChevronRight, Eye } from 'lucide-react'
import { useMoney } from '@/db/hooks.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { TransactionRow } from '@/features/activity/TransactionRow.tsx'

const dayFmt = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })

export function HomePage() {
  const { accounts, balances, available, safeToday, spentToday, transactions } = useMoney()
  const recent = transactions.slice(0, 5)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2 pb-1">
        <div>
          <p className="text-sm text-ink/50 dark:text-white/50">{dayFmt.format(new Date())}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Bantay</h1>
        </div>
        <Eye className="text-accent dark:text-accent-soft" size={28} />
      </header>

      {/* Total balance */}
      <GlassCard className="relative overflow-hidden">
        <p className="text-sm text-ink/55 dark:text-white/55">Available money</p>
        <Amount value={available} className="mt-1 block text-4xl font-semibold tracking-tight" />
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {accounts
            .filter((a) => a.kind !== 'credit')
            .map((a) => (
              <div
                key={a.id}
                className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-ink/[0.04] py-2 pr-4 pl-2 dark:bg-white/[0.06]"
              >
                <AccountIcon account={a} size={32} />
                <div>
                  <p className="text-xs text-ink/50 dark:text-white/50">{a.name}</p>
                  <Amount value={balances.get(a.id) ?? 0} className="text-sm font-medium" />
                </div>
              </div>
            ))}
        </div>
      </GlassCard>

      {/* Safe to spend */}
      <GlassCard className="bg-accent/90! dark:bg-accent/80! border-white/20! text-white">
        <p className="text-sm text-white/75">Safe to spend today</p>
        <Amount value={safeToday} className="mt-1 block text-3xl font-semibold tracking-tight" />
        <p className="mt-3 text-xs text-white/75">
          Spent today: <Amount value={spentToday} />
        </p>
      </GlassCard>

      {/* Recent */}
      <GlassCard className="p-2!">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <h2 className="font-semibold">Recent</h2>
          <Link to="/activity" className="text-accent dark:text-accent-soft flex items-center text-sm">
            See all <ChevronRight size={16} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ink/50 dark:text-white/50">
            Nothing yet. Tap <span className="text-accent font-semibold">+</span> to log your baon or an expense.
          </p>
        ) : (
          <ul>
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
