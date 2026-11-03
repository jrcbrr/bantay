import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ChevronRight, Flame } from 'lucide-react'
import { monthPeriod, noSpendStreaks, recap } from '@/domain/insights.ts'
import { markPaid } from '@/db/actions.ts'
import { showToast } from '@/app/toast.ts'
import { db } from '@/db/db.ts'
import { baonWeekdays, useBudgets, useLookups, type Money } from '@/db/hooks.ts'
import { budgetProgress, flowBetween, periodRange } from '@/domain/budgets.ts'
import { addDays, daysBetween, fromISODate, toISODate, today } from '@/domain/dates.ts'
import { averageBaon, firstShortfall, forecast, spendingPace } from '@/domain/forecast.ts'
import { monthlyCost } from '@/domain/recurring.ts'
import type { DashboardCardId } from '@/domain/types.ts'
import { TransactionRow } from '@/features/activity/TransactionRow.tsx'
import { dueLabel } from '@/ui/dueLabel.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { ProgressBar } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { ForecastChart } from './ForecastChart.tsx'

type CardProps = { money: Money }

function CardHeader({ title, to, linkText = 'See all' }: { title: string; to?: string; linkText?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      {to && (
        <Link to={to} className="text-accent dark:text-accent-soft flex items-center text-sm">
          {linkText} <ChevronRight size={16} />
        </Link>
      )}
    </div>
  )
}

const muted = 'text-ink/50 dark:text-white/50'

function BalanceCard({ money }: CardProps) {
  const { available, accounts, balances } = money
  return (
    <GlassCard>
      <p className={`text-sm ${muted}`}>Spendable money</p>
      <Amount value={available} className="mt-1 block text-3xl font-semibold tracking-tight sm:text-4xl" />
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
                <p className={`text-xs ${muted}`}>
                  {a.name}
                  {a.savings && ' · savings'}
                </p>
                <Amount value={balances.get(a.id) ?? 0} className="text-sm font-medium" />
              </div>
            </div>
          ))}
      </div>
    </GlassCard>
  )
}

/** Mark today as a no-baon day (holiday, no class), or undo it. Old dates are pruned. */
async function toggleNoBaonToday(current: string[] | undefined) {
  const todayISO = toISODate(today())
  const weekAgo = toISODate(addDays(today(), -7))
  const kept = (current ?? []).filter((d) => d >= weekAgo)
  const next = kept.includes(todayISO) ? kept.filter((d) => d !== todayISO) : [...kept, todayISO]
  await db.settings.update('app', { skipBaonDates: next })
}

function SafeCard({ money }: CardProps) {
  const { safeToday, spentToday, upcomingBills, settings } = money
  const todayISO = toISODate(today())
  const usesDays = (settings?.allowanceCycle ?? 'days') === 'days'
  const isBaonWeekday = (settings?.allowanceDays ?? [1, 2, 3, 4, 5]).includes(today().getDay())
  const skipped = !!settings?.skipBaonDates?.includes(todayISO)
  return (
    <GlassCard className="bg-accent/90! dark:bg-accent/80! border-white/20! text-white">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-white/75">Safe to spend today</p>
        {usesDays && isBaonWeekday && (
          <button
            onClick={() => void toggleNoBaonToday(settings?.skipBaonDates)}
            aria-pressed={skipped}
            className={`-mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              skipped ? 'text-accent bg-white' : 'bg-white/15 text-white'
            }`}
          >
            {skipped ? '✓ No baon today' : 'No baon today?'}
          </button>
        )}
      </div>
      <Amount value={safeToday} className="mt-1 block text-2xl font-semibold tracking-tight sm:text-3xl" />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
        <span>
          Spent today: <Amount value={spentToday} />
        </span>
        {upcomingBills > 0 && (
          <span>
            Set aside for bills: <Amount value={upcomingBills} />
          </span>
        )}
        {skipped && <span>Today's spending comes out of your last baon</span>}
      </div>
    </GlassCard>
  )
}

function ForecastCard({ money }: CardProps) {
  const { available, transactions, recurring, settings } = money
  const now = today()
  const pace = spendingPace(transactions, now)
  const days = baonWeekdays(settings)
  const baon = averageBaon(transactions, now, days)
  const points = forecast({ startBalance: available, today: now, days: 30, dailySpend: pace, baonPerDay: baon, baonDays: days, recurring })
  const end = points[points.length - 1]!
  // Already below zero today is its own message; otherwise look for the first future day under zero.
  const belowNow = available < 0
  const shortfall = belowNow ? undefined : firstShortfall(points.slice(1))

  return (
    <GlassCard>
      <CardHeader title="Next 30 days" />
      {transactions.length === 0 ? (
        <p className={`py-4 text-center text-sm ${muted}`}>Log a few days of baon and spending to see where you're headed.</p>
      ) : (
        <>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className={`text-xs ${muted}`}>Projected in 30 days</p>
              <Amount
                value={end.balance}
                className={`text-2xl font-semibold tracking-tight ${end.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}
              />
            </div>
            <p className={`text-right text-xs ${muted}`}>
              Spending ~<Amount value={pace} />
              /day
              <br />
              Baon ~<Amount value={baon} />
              /school day
            </p>
          </div>
          <ForecastChart points={points} />
          {belowNow && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertTriangle size={14} /> Your spendable money is below zero right now
            </p>
          )}
          {shortfall && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertTriangle size={14} /> At this pace you'd run out around{' '}
              {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(fromISODate(shortfall.date))}
            </p>
          )}
        </>
      )}
    </GlassCard>
  )
}

function FlowCard({ money }: CardProps) {
  const range = periodRange(new Date(), 'monthly')
  const { income, expense } = flowBetween(money.transactions, range)
  const max = Math.max(income, expense, 1)
  const month = new Intl.DateTimeFormat('en-PH', { month: 'long' }).format(new Date())
  const rows: [string, number, string][] = [
    ['Money in', income, 'bg-emerald-500'],
    ['Money out', expense, 'bg-red-500'],
  ]
  return (
    <GlassCard>
      <CardHeader title={`${month} money flow`} to="/activity" linkText="Details" />
      <div className="space-y-3">
        {rows.map(([label, v, color]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={muted}>{label}</span>
              <Amount value={v} className="font-medium" />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.07]">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-3 text-sm ${muted}`}>
        Net: <Amount value={income - expense} sign tone="auto" className="font-semibold" />
      </p>
    </GlassCard>
  )
}

function InsightsCard({ money }: CardProps) {
  const now = today()
  const r = recap(money.transactions, monthPeriod(now.getFullYear(), now.getMonth()))
  const streak = noSpendStreaks(money.transactions, now)
  return (
    <GlassCard>
      <CardHeader title="This month so far" to="/insights" linkText="Insights" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={`text-xs ${muted}`}>Saved</p>
          <Amount value={r.saved} className="text-xl font-semibold" />
          {r.income > 0 && <p className={`text-xs ${muted}`}>{Math.max(0, Math.round(r.savingsRate * 100))}% of money in</p>}
        </div>
        <div>
          <p className={`flex items-center gap-1 text-xs ${muted}`}>
            <Flame size={13} className="text-orange-500" /> No-spend streak
          </p>
          <p className="text-xl font-semibold">
            {streak.current} <span className="text-sm font-normal">day{streak.current === 1 ? '' : 's'}</span>
          </p>
          <p className={`text-xs ${muted}`}>Best: {streak.longest}</p>
        </div>
      </div>
    </GlassCard>
  )
}

function BudgetsCard({ money }: CardProps) {
  const budgets = useBudgets()
  const lookups = useLookups()
  const now = new Date()
  const ranked = budgets
    .map((b) => ({ b, p: budgetProgress(b, money.transactions, now) }))
    .sort((a, b) => b.p.ratio - a.p.ratio)
    .slice(0, 4)
  return (
    <GlassCard>
      <CardHeader title="Budgets" to="/plan" />
      {ranked.length === 0 ? (
        <p className={`py-2 text-sm ${muted}`}>
          No budgets yet.{' '}
          <Link to="/plan" className="text-accent dark:text-accent-soft font-medium">
            Set one
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {ranked.map(({ b, p }) => {
            const cat = lookups.categories.get(b.categoryId)
            return (
              <div key={b.id}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  {cat && <CategoryIcon category={cat} />}
                  <span className="flex-1 truncate">{cat?.name}</span>
                  <span className={`text-xs ${p.status === 'over' ? 'text-red-600 dark:text-red-400' : muted}`}>
                    {p.remaining >= 0 ? (
                      <>
                        <Amount value={p.remaining} /> left
                      </>
                    ) : (
                      <>
                        <Amount value={-p.remaining} /> over
                      </>
                    )}
                  </span>
                </div>
                <ProgressBar ratio={p.ratio} tone={p.status} />
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

function BillsCard({ money }: CardProps) {
  const active = money.recurring.filter((r) => r.active)
  const next = active.slice(0, 4)
  const subs = active.filter((r) => r.isSubscription).reduce((s, r) => s + monthlyCost(r), 0)
  return (
    <GlassCard>
      <CardHeader title="Upcoming bills" to="/plan" />
      {next.length === 0 ? (
        <p className={`py-2 text-sm ${muted}`}>
          Nothing scheduled.{' '}
          <Link to="/plan" className="text-accent dark:text-accent-soft font-medium">
            Add a bill or subscription
          </Link>
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {next.map((r) => {
              const overdue = daysBetween(today(), fromISODate(r.nextDue)) < 0
              return (
                <li key={r.id} className="flex items-center gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.label}</p>
                    <p className={`text-xs ${overdue ? 'text-red-600 dark:text-red-400' : muted}`}>{dueLabel(r.nextDue)}</p>
                  </div>
                  <Amount value={r.type === 'income' ? r.amount : -r.amount} sign tone="auto" className="text-sm font-semibold" />
                  <button
                    onClick={async () => showToast(`${r.label} ${r.type === 'income' ? 'received' : 'paid'}`, await markPaid(r))}
                    className="rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-semibold dark:bg-white/[0.08]"
                  >
                    {r.type === 'income' ? 'Got it' : 'Paid'}
                  </button>
                </li>
              )
            })}
          </ul>
          {subs > 0 && (
            <p className={`mt-2 border-t border-ink/5 pt-2 text-xs dark:border-white/5 ${muted}`}>
              Subscriptions cost you <Amount value={subs} className="font-medium" /> a month
            </p>
          )}
        </>
      )}
    </GlassCard>
  )
}

function LiquidityCard({ money }: CardProps) {
  const { available, savings } = money
  const total = Math.max(0, available) + Math.max(0, savings)
  const liquidPct = total > 0 ? Math.round((Math.max(0, available) / total) * 100) : 0
  return (
    <GlassCard>
      <CardHeader title="Spendable vs savings" to="/wealth" linkText="Wealth" />
      {total === 0 ? (
        <p className={`text-sm ${muted}`}>Mark an account as savings on the Wealth tab to keep it out of safe to spend.</p>
      ) : (
        <>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {available > 0 && <div className="bg-accent" style={{ width: `${liquidPct}%` }} />}
            {savings > 0 && <div className="bg-teal-600" style={{ width: `${100 - liquidPct}%` }} />}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
                <span className="bg-accent h-2 w-2 rounded-full" /> Spendable · {liquidPct}%
              </p>
              <Amount value={available} className="font-semibold" />
            </div>
            <div>
              <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
                <span className="h-2 w-2 rounded-full bg-teal-600" /> Savings · {100 - liquidPct}%
              </p>
              <Amount value={savings} className="font-semibold" />
            </div>
          </div>
        </>
      )}
    </GlassCard>
  )
}

function NetWorthCard({ money }: CardProps) {
  const { worth, assetsValue, owed, assets } = money
  return (
    <GlassCard>
      <CardHeader title="Net worth" to="/wealth" linkText="Wealth" />
      <Amount value={worth} className="block text-2xl font-semibold tracking-tight sm:text-3xl" />
      <p className={`mt-2 text-xs ${muted}`}>
        Includes <Amount value={assetsValue} /> in {assets.length} asset{assets.length === 1 ? '' : 's'}
        {owed > 0 && (
          <>
            {' '}
            and <Amount value={owed} /> owed on cards
          </>
        )}
      </p>
    </GlassCard>
  )
}

function RecentCard({ money }: CardProps) {
  const lookups = useLookups()
  const recent = money.transactions.slice(0, 5)
  return (
    <GlassCard className="p-2!">
      <div className="px-3 pt-2">
        <CardHeader title="Recent" to="/activity" />
      </div>
      {recent.length === 0 ? (
        <p className={`px-3 pb-6 text-center text-sm ${muted}`}>
          Nothing yet. Tap <span className="text-accent font-semibold">+</span> to log your baon or an expense.
        </p>
      ) : (
        <ul>
          {recent.map((t) => (
            <TransactionRow key={t.id} tx={t} lookups={lookups} />
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

export interface CardDef {
  title: string
  description: string
  render: (props: CardProps) => ReactNode
}

export const dashboardCards: Record<DashboardCardId, CardDef> = {
  balance: { title: 'Balance', description: 'Spendable money and each account', render: (p) => <BalanceCard {...p} /> },
  safe: { title: 'Safe to spend', description: "Today's limit until your next baon", render: (p) => <SafeCard {...p} /> },
  forecast: { title: '30-day forecast', description: 'Where your balance is heading', render: (p) => <ForecastCard {...p} /> },
  flow: { title: 'Money flow', description: "This month's money in vs out", render: (p) => <FlowCard {...p} /> },
  insights: { title: 'Savings & streak', description: 'Saved this month and no-spend streak', render: (p) => <InsightsCard {...p} /> },
  budgets: { title: 'Budgets', description: 'Closest to the limit first', render: (p) => <BudgetsCard {...p} /> },
  bills: { title: 'Upcoming bills', description: 'Bills & subscriptions due soon', render: (p) => <BillsCard {...p} /> },
  liquidity: { title: 'Spendable vs savings', description: 'Money you can use vs set aside', render: (p) => <LiquidityCard {...p} /> },
  networth: { title: 'Net worth', description: 'Accounts + assets − card debt', render: (p) => <NetWorthCard {...p} /> },
  recent: { title: 'Recent', description: 'Your latest transactions', render: (p) => <RecentCard {...p} /> },
}
