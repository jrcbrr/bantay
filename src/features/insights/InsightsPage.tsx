import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react'
import { baonWeekdays, useArchives, useLookups, useMoney } from '@/db/hooks.ts'
import { fromISODate, toISODate, today } from '@/domain/dates.ts'
import {
  biggestExpenses,
  categoryTrends,
  monthPeriod,
  monthlyTotals,
  noSpendStreaks,
  previousPeriod,
  recap,
  spendByDayType,
  spendingByCategory,
  weeklyBaon,
  yearPeriod,
} from '@/domain/insights.ts'
import { TransactionRow } from '@/features/activity/TransactionRow.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { BarChart, INCOME_COLOR, SPEND_COLOR } from '@/ui/BarChart.tsx'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { Segmented } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'

type Mode = 'month' | 'year'

const muted = 'text-ink/50 dark:text-white/50'
const monthShort = new Intl.DateTimeFormat('en-PH', { month: 'short' })
const monthLong = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' })
const dayShort = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <GlassCard>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </GlassCard>
  )
}

function Change({ now, before, goodWhenDown = true }: { now: number; before: number; goodWhenDown?: boolean }) {
  if (before <= 0) return null
  const change = (now - before) / before
  if (Math.abs(change) < 0.005) return <span className={`text-xs ${muted}`}>same as before</span>
  const up = change > 0
  const good = goodWhenDown ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      <Icon size={14} />
      {Math.round(Math.abs(change) * 100)}%
    </span>
  )
}

export function InsightsPage() {
  const { transactions, settings } = useMoney()
  const lookups = useLookups()
  const archives = useArchives()
  const [mode, setMode] = useState<Mode>('month')
  const [cursor, setCursor] = useState(() => ({ year: today().getFullYear(), month: today().getMonth() }))

  const period = mode === 'month' ? monthPeriod(cursor.year, cursor.month) : yearPeriod(cursor.year)
  const prev = previousPeriod(period)
  const todayISO = toISODate(today())
  const isCurrent = period.start <= todayISO && todayISO < period.end
  const days = baonWeekdays(settings)

  const data = useMemo(() => {
    const r = recap(transactions, period)
    const before = recap(transactions, prev)
    return {
      r,
      before,
      cats: spendingByCategory(transactions, period),
      trends: categoryTrends(transactions, period).filter((t) => t.now > 0 && t.before > 0).slice(0, 5),
      biggest: biggestExpenses(transactions, period, 10),
      months:
        mode === 'month'
          ? monthlyTotals(transactions, cursor.year, cursor.month, 6)
          : monthlyTotals(transactions, cursor.year, 11, 12),
      dayType: spendByDayType(transactions, period, days, isCurrent ? todayISO : period.end),
      baonTotal: transactions
        .filter((t) => t.type === 'income' && t.categoryId === 'baon' && t.date >= period.start && t.date < period.end)
        .reduce((s, t) => s + t.amount, 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, period.start, mode, settings])

  const streaks = useMemo(() => noSpendStreaks(transactions, today()), [transactions])
  const weeks = useMemo(() => weeklyBaon(transactions, today(), 8), [transactions])

  const move = (delta: number) => {
    const d = mode === 'month' ? new Date(cursor.year, cursor.month + delta, 1) : new Date(cursor.year + delta, cursor.month, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const label = mode === 'month' ? monthLong.format(new Date(cursor.year, cursor.month, 1)) : String(cursor.year)
  const catName = (id: string) => (id === 'uncategorized' ? 'Uncategorized' : (lookups.categories.get(id)?.name ?? 'Category'))
  const { r, before } = data
  const empty = r.count === 0

  return (
    <>
      <PageHeader title="Insights" subtitle="Where your money went" />

      <div className="mb-4 space-y-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            ['month', 'Month'],
            ['year', 'Year'],
          ]}
        />
        <div className="flex items-center justify-between">
          <button aria-label="Previous" onClick={() => move(-1)} className="glass rounded-full p-2">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold">{label}</span>
          <button aria-label="Next" onClick={() => move(1)} disabled={isCurrent} className="glass rounded-full p-2 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {mode === 'year' && archives.find((a) => a.year === cursor.year) && (() => {
          const a = archives.find((x) => x.year === cursor.year)!
          const top = Object.entries(a.byCategory).sort((x, y) => y[1] - x[1]).slice(0, 5)
          return (
            <Card title={`${a.year}, archived`} aside={<span className={`text-xs ${muted}`}>{a.count} transactions</span>}>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className={`text-xs ${muted}`}>Money in</p>
                  <Amount value={a.income} className="font-semibold" />
                </div>
                <div>
                  <p className={`text-xs ${muted}`}>Spent</p>
                  <Amount value={a.expense} className="font-semibold" />
                </div>
                <div>
                  <p className={`text-xs ${muted}`}>Saved</p>
                  <Amount value={a.income - a.expense} className="font-semibold" />
                </div>
              </div>
              {top.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {top.map(([id, amt]) => (
                    <li key={id} className="flex justify-between">
                      <span>{catName(id)}</span>
                      <Amount value={amt} />
                    </li>
                  ))}
                </ul>
              )}
              <p className={`mt-3 text-xs ${muted}`}>Details for this year were archived. Restore a backup from before archiving to see them again.</p>
            </Card>
          )
        })()}

        {/* Recap / year in review */}
        <GlassCard className="bg-accent/90! dark:bg-accent/80! border-white/20! text-white">
          <p className="text-sm text-white/75">{mode === 'month' ? `${label} recap` : `${label} in review`}</p>
          {empty ? (
            <p className="mt-2 text-sm text-white/85">Nothing logged in this {mode} yet.</p>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-white/70">Money in</p>
                  <Amount value={r.income} className="font-semibold" />
                </div>
                <div>
                  <p className="text-xs text-white/70">Spent</p>
                  <Amount value={r.expense} className="font-semibold" />
                </div>
                <div>
                  <p className="text-xs text-white/70">Saved</p>
                  <Amount value={r.saved} className="font-semibold" />
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-white/90">
                {r.income > 0 && (
                  <li>
                    You kept <b>{Math.max(0, Math.round(r.savingsRate * 100))}%</b> of what came in.
                  </li>
                )}
                {before.expense > 0 && (
                  <li>
                    Spending was {r.expense > before.expense ? 'up' : 'down'}{' '}
                    <b>{Math.round((Math.abs(r.expense - before.expense) / before.expense) * 100)}%</b> from the {mode} before.
                  </li>
                )}
                {r.topCategory && (
                  <li>
                    Most went to <b>{catName(r.topCategory.id)}</b> (<Amount value={r.topCategory.amount} />
                    ).
                  </li>
                )}
                {r.biggest && (
                  <li>
                    Biggest spend: <b>{r.biggest.note || catName(r.biggest.categoryId ?? 'uncategorized')}</b>,{' '}
                    <Amount value={r.biggest.amount} /> on {dayShort.format(fromISODate(r.biggest.date))}.
                  </li>
                )}
                {mode === 'year' && data.baonTotal > 0 && (
                  <li>
                    Total baon received: <b><Amount value={data.baonTotal} /></b>.
                  </li>
                )}
                <li>{r.count} transactions logged.</li>
              </ul>
            </>
          )}
        </GlassCard>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4!">
            <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
              <Flame size={14} className="text-orange-500" /> No-spend streak
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {streaks.current} <span className="text-sm font-normal">day{streaks.current === 1 ? '' : 's'}</span>
            </p>
          </GlassCard>
          <GlassCard className="p-4!">
            <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
              <Trophy size={14} className="text-amber-500" /> Longest streak
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {streaks.longest} <span className="text-sm font-normal">day{streaks.longest === 1 ? '' : 's'}</span>
            </p>
          </GlassCard>
        </div>
        <p className={`-mt-2 px-1 text-xs ${muted}`}>Fare and bills don't break a streak; other spending does.</p>

        {/* Where it went */}
        {data.cats.length > 0 && (
          <Card title="Where it went" aside={<Amount value={r.expense} className={`text-sm ${muted}`} />}>
            <ul className="space-y-3">
              {data.cats.slice(0, 8).map((c) => {
                const cat = lookups.categories.get(c.id)
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      {cat && <CategoryIcon category={cat} />}
                      <span className="flex-1 truncate">{catName(c.id)}</span>
                      <span className={`text-xs ${muted}`}>{Math.round(c.share * 100)}%</span>
                      <Amount value={c.amount} className="w-24 text-right font-medium" />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.07]">
                      <div className="h-full rounded-full" style={{ width: `${c.share * 100}%`, background: cat?.color ?? '#94a3b8' }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {/* Trends */}
        {data.trends.length > 0 && (
          <Card title={`Compared with ${mode === 'month' ? 'last month' : 'last year'}`}>
            <ul className="space-y-2.5">
              {data.trends.map((t) => {
                const cat = lookups.categories.get(t.id)
                const up = t.now > t.before
                return (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    {cat && <CategoryIcon category={cat} />}
                    <span className="flex-1 truncate">
                      {catName(t.id)}{' '}
                      <span className={muted}>
                        {up ? 'up' : 'down'} <Amount value={Math.abs(t.now - t.before)} />
                      </span>
                    </span>
                    <Change now={t.now} before={t.before} />
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {/* Months */}
        <Card title={mode === 'month' ? 'Last 6 months' : `${cursor.year} by month`}>
          <BarChart
            series={[
              { name: 'Money in', color: INCOME_COLOR },
              { name: 'Spent', color: SPEND_COLOR },
            ]}
            groups={data.months.map((m) => {
              const d = fromISODate(`${m.month}-01`)
              return { label: monthShort.format(d), title: monthLong.format(d), values: [m.income, m.expense] }
            })}
          />
        </Card>

        {/* Baon */}
        <Card title="Baon, last 8 weeks">
          <BarChart
            series={[
              { name: 'Baon', color: INCOME_COLOR },
              { name: 'Spent', color: SPEND_COLOR },
            ]}
            groups={weeks.map((w) => ({
              label: dayShort.format(fromISODate(w.week)),
              title: `Week of ${dayShort.format(fromISODate(w.week))}`,
              values: [w.baon, w.spent],
            }))}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/5 pt-3 dark:border-white/5">
            <div>
              <p className={`text-xs ${muted}`}>Avg per school day</p>
              <Amount value={data.dayType.baonDayAvg} className="font-semibold" />
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Avg per other day</p>
              <Amount value={data.dayType.otherDayAvg} className="font-semibold" />
            </div>
          </div>
          <p className={`mt-2 text-xs ${muted}`}>Daily spending this {mode}, including days you spent nothing.</p>
        </Card>

        {/* Biggest */}
        {data.biggest.length > 0 && (
          <GlassCard className="p-2!">
            <h2 className="px-3 pt-3 pb-1 font-semibold">Biggest expenses</h2>
            <ol>
              {data.biggest.map((t) => (
                <TransactionRow key={t.id} tx={t} lookups={lookups} />
              ))}
            </ol>
          </GlassCard>
        )}
      </div>
    </>
  )
}
