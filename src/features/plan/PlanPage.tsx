import { useState, type ReactNode } from 'react'
import { CalendarClock, CalendarHeart, Check, Gift, PiggyBank, Plus, Scale, ShoppingBag, Target, Wallet } from 'lucide-react'
import { db } from '@/db/db.ts'
import { challengeTotals, currentStep, daysToAfford, eventSpent, savingRate, stepAmount, type Challenge } from '@/domain/planExtras.ts'
import { useSheets } from '@/app/sheets.ts'
import { AffordSheet } from './AffordSheet.tsx'
import { ChallengeSheet, type ChallengeTarget } from './ChallengeSheet.tsx'
import { EventSheet, type EventSheetTarget } from './EventSheet.tsx'
import { WishSheet, priorityLabel, type WishTarget } from './WishSheet.tsx'
import { markPaid } from '@/db/actions.ts'
import { useBudgets, useChallenges, useEvents, useGoals, useLookups, useMoney, useWishlist } from '@/db/hooks.ts'
import { budgetProgress } from '@/domain/budgets.ts'
import { daysBetween, fromISODate, toISODate, today } from '@/domain/dates.ts'
import { monthlyCost } from '@/domain/recurring.ts'
import type { Recurring } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'
import { dueLabel } from '@/ui/dueLabel.ts'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { ProgressBar } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { BillSheet, type BillTarget } from './BillSheet.tsx'
import { BudgetSheet, type BudgetTarget } from './BudgetSheet.tsx'
import { GoalSheet, type GoalTarget } from './GoalSheet.tsx'


function Section({
  icon,
  title,
  aside,
  onAdd,
  addLabel,
  children,
}: {
  icon: ReactNode
  title: string
  aside?: ReactNode
  onAdd: () => void
  addLabel: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        {icon}
        <h2 className="flex-1 font-semibold">{title}</h2>
        {aside}
        <button
          onClick={onAdd}
          aria-label={addLabel}
          className="bg-accent/12 text-accent dark:text-accent-soft flex h-8 w-8 items-center justify-center rounded-full"
        >
          <Plus size={18} />
        </button>
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <GlassCard>
      <p className="py-2 text-center text-sm text-ink/50 dark:text-white/50">{children}</p>
    </GlassCard>
  )
}

export function PlanPage() {
  const { transactions, recurring, balances, available } = useMoney()
  const events = useEvents()
  const challenges = useChallenges()
  const wishlist = useWishlist()
  const openAdd = useSheets((s) => s.openAdd)
  const [eventTarget, setEventTarget] = useState<EventSheetTarget>(null)
  const [challengeTarget, setChallengeTarget] = useState<ChallengeTarget>(null)
  const [wishTarget, setWishTarget] = useState<WishTarget>(null)
  const [afford, setAfford] = useState<{ price?: number; label?: string } | null>(null)
  const perDay = savingRate(transactions, today())
  const todayISO = toISODate(today())
  const budgets = useBudgets()
  const goals = useGoals()
  const lookups = useLookups()
  const now = new Date()

  const [budgetTarget, setBudgetTarget] = useState<BudgetTarget>(null)
  const [goalTarget, setGoalTarget] = useState<GoalTarget>(null)
  const [billTarget, setBillTarget] = useState<BillTarget>(null)

  const subsMonthly = recurring
    .filter((r) => r.active && r.isSubscription)
    .reduce((s, r) => s + monthlyCost(r), 0)

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle="Budgets, goals & bills"
        action={
          <button onClick={() => setAfford({})} className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">
            <Scale size={15} className="text-accent dark:text-accent-soft" /> Can I afford it?
          </button>
        }
      />
      <div className="space-y-7">
        {/* Budgets */}
        <Section
          icon={<Wallet size={18} className="text-accent dark:text-accent-soft" />}
          title="Budgets"
          onAdd={() => setBudgetTarget('new')}
          addLabel="Add budget"
        >
          {budgets.length === 0 ? (
            <Empty>Set a weekly or monthly limit for things like Meals or Milk Tea.</Empty>
          ) : (
            <GlassCard className="space-y-1 p-2!">
              {budgets.map((b) => {
                const cat = lookups.categories.get(b.categoryId)
                const p = budgetProgress(b, transactions, now)
                return (
                  <button
                    key={b.id}
                    onClick={() => setBudgetTarget(b)}
                    className="block w-full rounded-2xl px-3 py-3 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {cat && <CategoryIcon category={cat} />}
                      <span className="flex-1 truncate text-sm font-medium">{cat?.name ?? 'Category'}</span>
                      <span className="text-xs text-ink/50 dark:text-white/50">
                        <Amount value={p.spent} /> / <Amount value={p.limit} />
                      </span>
                    </div>
                    <ProgressBar ratio={p.ratio} tone={p.status} />
                    <p
                      className={`mt-1.5 text-xs ${
                        p.status === 'over' ? 'text-red-600 dark:text-red-400' : 'text-ink/50 dark:text-white/50'
                      }`}
                    >
                      {p.remaining >= 0 ? (
                        <>
                          <Amount value={p.remaining} /> left this {b.period === 'weekly' ? 'week' : 'month'}
                        </>
                      ) : (
                        <>
                          <Amount value={-p.remaining} /> over
                        </>
                      )}
                    </p>
                  </button>
                )
              })}
            </GlassCard>
          )}
        </Section>

        {/* Event budgets */}
        <Section
          icon={<CalendarHeart size={18} className="text-accent dark:text-accent-soft" />}
          title="Event budgets"
          onAdd={() => setEventTarget('new')}
          addLabel="Add event budget"
        >
          {events.length === 0 ? (
            <Empty>Planning a field trip, Christmas or a birthday? Give it its own budget for those dates.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {events.map((e) => {
                const spent = eventSpent(e, transactions)
                const ratio = e.limit > 0 ? spent / e.limit : 0
                const status = todayISO < e.start ? 'Upcoming' : todayISO > e.end ? 'Ended' : 'On now'
                return (
                  <button key={e.id} onClick={() => setEventTarget(e)} className={`glass rounded-3xl p-4 text-left ${status === 'Ended' ? 'opacity-60' : ''}`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.name}</p>
                        <p className="text-xs text-ink/50 dark:text-white/50">
                          {status} · {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).formatRange(fromISODate(e.start), fromISODate(e.end))}
                        </p>
                      </div>
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: e.color }} />
                    </div>
                    <ProgressBar ratio={ratio} tone={ratio > 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok'} />
                    <p className="mt-1.5 text-xs text-ink/55 dark:text-white/55">
                      <Amount value={spent} /> of <Amount value={e.limit} />
                      {spent > e.limit && (
                        <span className="text-red-600 dark:text-red-400">
                          {' '}
                          · <Amount value={spent - e.limit} /> over
                        </span>
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </Section>

        {/* Goals */}
        <Section
          icon={<Target size={18} className="text-accent dark:text-accent-soft" />}
          title="Savings goals"
          onAdd={() => setGoalTarget('new')}
          addLabel="Add goal"
        >
          {goals.length === 0 ? (
            <Empty>Saving up for something? Add a goal and link it to a savings account.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {goals.map((g) => {
                const saved = g.accountId ? Math.max(0, balances.get(g.accountId) ?? 0) : g.saved
                const ratio = g.target > 0 ? saved / g.target : 0
                const linked = g.accountId ? lookups.accounts.get(g.accountId) : undefined
                return (
                  <button key={g.id} onClick={() => setGoalTarget(g)} className="glass rounded-3xl p-4 text-left">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{g.name}</p>
                        <p className="text-xs text-ink/50 dark:text-white/50">
                          {linked ? `In ${linked.name}` : 'Manual'}
                          {g.deadline && ` · by ${dueLabel(g.deadline).replace(/^In /, '')}`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: g.color }}>
                        {Math.min(100, Math.round(ratio * 100))}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07] dark:bg-white/[0.08]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, ratio * 100)}%`, background: g.color }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ink/55 dark:text-white/55">
                      <Amount value={saved} /> of <Amount value={g.target} />
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </Section>

        {/* Ipon challenge */}
        <Section
          icon={<PiggyBank size={18} className="text-accent dark:text-accent-soft" />}
          title="Ipon challenge"
          onAdd={() => setChallengeTarget('new')}
          addLabel="Start an ipon challenge"
        >
          {challenges.length === 0 ? (
            <Empty>Try the 52-week challenge or ₱20 a day. Tick off each step as you save.</Empty>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <ChallengeCard key={c.id} ch={c} onEdit={() => setChallengeTarget(c)} />
              ))}
            </div>
          )}
        </Section>

        {/* Wishlist */}
        <Section
          icon={<Gift size={18} className="text-accent dark:text-accent-soft" />}
          title="Wishlist"
          aside={
            perDay > 0 ? (
              <span className="text-xs text-ink/50 dark:text-white/50">
                Saving ~<Amount value={perDay} />
                /day
              </span>
            ) : undefined
          }
          onAdd={() => setWishTarget('new')}
          addLabel="Add to wishlist"
        >
          {wishlist.length === 0 ? (
            <Empty>Things you want to buy. See how long until you can afford each one.</Empty>
          ) : (
            <GlassCard className="p-2!">
              <ul>
                {wishlist.map((w) => {
                  const days = daysToAfford(w.price, available, perDay)
                  return (
                    <li key={w.id} className={`flex items-center gap-2 rounded-2xl pr-2 ${w.bought ? 'opacity-50' : ''}`}>
                      <button onClick={() => setWishTarget(w)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left">
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${w.bought ? 'line-through' : ''}`}>{w.name}</p>
                          <p className="truncate text-xs text-ink/50 dark:text-white/50">
                            {priorityLabel[w.priority]}
                            {!w.bought &&
                              (days === 0
                                ? ' · you have enough now'
                                : days === null
                                  ? ' · start saving to see a date'
                                  : ` · ~${days} day${days === 1 ? '' : 's'} of saving`)}
                            {w.bought && ' · bought'}
                          </p>
                        </div>
                        <Amount value={w.price} className="text-sm font-semibold" />
                      </button>
                      {!w.bought && (
                        <>
                          <button
                            onClick={() => setAfford({ price: w.price, label: w.name })}
                            aria-label={`Can I afford ${w.name}?`}
                            className="rounded-full bg-ink/[0.05] p-2 dark:bg-white/[0.08]"
                          >
                            <Scale size={15} />
                          </button>
                          <button
                            onClick={() => openAdd({ prefill: { type: 'expense', amount: w.price, note: w.name, categoryId: 'shopping', wishId: w.id } })}
                            aria-label={`Log buying ${w.name}`}
                            className="rounded-full bg-ink/[0.05] p-2 dark:bg-white/[0.08]"
                          >
                            <ShoppingBag size={15} />
                          </button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </GlassCard>
          )}
        </Section>

        {/* Bills & subscriptions */}
        <Section
          icon={<CalendarClock size={18} className="text-accent dark:text-accent-soft" />}
          title="Bills & subscriptions"
          aside={
            subsMonthly > 0 ? (
              <span className="text-xs text-ink/50 dark:text-white/50">
                Subs: <Amount value={subsMonthly} />
                /mo
              </span>
            ) : undefined
          }
          onAdd={() => setBillTarget('new')}
          addLabel="Add bill or subscription"
        >
          {recurring.length === 0 ? (
            <Empty>Add Spotify, Netflix, school fees or dorm rent. Bills due before your next baon are set aside from safe to spend.</Empty>
          ) : (
            <GlassCard className="p-2!">
              <ul>
                {recurring.map((r) => (
                  <BillRow key={r.id} r={r} onEdit={() => setBillTarget(r)} />
                ))}
              </ul>
            </GlassCard>
          )}
        </Section>
      </div>

      <BudgetSheet target={budgetTarget} onClose={() => setBudgetTarget(null)} />
      <GoalSheet target={goalTarget} onClose={() => setGoalTarget(null)} />
      <BillSheet target={billTarget} onClose={() => setBillTarget(null)} />
      <EventSheet target={eventTarget} onClose={() => setEventTarget(null)} />
      <ChallengeSheet target={challengeTarget} onClose={() => setChallengeTarget(null)} />
      <WishSheet target={wishTarget} onClose={() => setWishTarget(null)} />
      <AffordSheet open={!!afford} initialPrice={afford?.price} label={afford?.label} onClose={() => setAfford(null)} />
    </>
  )
}

function BillRow({ r, onEdit }: { r: Recurring; onEdit: () => void }) {
  const overdue = daysBetween(today(), fromISODate(r.nextDue)) < 0
  return (
    <li className={`flex items-center gap-2 rounded-2xl pr-2 ${r.active ? '' : 'opacity-50'}`}>
      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{r.label}</p>
          <p className={`text-xs ${overdue && r.active ? 'text-red-600 dark:text-red-400' : 'text-ink/50 dark:text-white/50'}`}>
            {r.active ? dueLabel(r.nextDue) : 'Paused'} · {r.frequency}
          </p>
        </div>
        <Amount value={r.type === 'income' ? r.amount : -r.amount} sign tone="auto" className="text-sm font-semibold" />
      </button>
      {r.active && (
        <button
          onClick={() => void markPaid(r)}
          className="flex items-center gap-1 rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold dark:bg-white/[0.08]"
          title={r.type === 'income' ? 'Mark received: logs it and moves to the next date' : 'Mark paid: logs it and moves to the next date'}
        >
          <Check size={14} /> {r.type === 'income' ? 'Got it' : 'Paid'}
        </button>
      )}
    </li>
  )
}

function ChallengeCard({ ch, onEdit }: { ch: Challenge; onEdit: () => void }) {
  const { saved, target, doneSteps } = challengeTotals(ch)
  const now = currentStep(ch, today())
  const done = new Set(ch.done)
  const toggle = (i: number) => {
    const next = done.has(i) ? ch.done.filter((x) => x !== i) : [...ch.done, i]
    void db.challenges.update(ch.id, { done: next })
  }
  const unit = ch.kind === 'weekly-52' ? 'Week' : ch.kind === 'daily' ? 'Day' : 'Step'
  return (
    <GlassCard>
      <button onClick={onEdit} className="mb-3 block w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{ch.name}</p>
          <span className="text-sm font-semibold">{target > 0 ? Math.round((saved / target) * 100) : 0}%</span>
        </div>
        <p className="text-xs text-ink/50 dark:text-white/50">
          <Amount value={saved} /> of <Amount value={target} /> · {doneSteps}/{ch.steps} done · {unit.toLowerCase()} {now + 1} today
        </p>
      </button>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ch.steps > 60 ? 10 : 13}, minmax(0, 1fr))` }}>
        {Array.from({ length: ch.steps }, (_, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            aria-pressed={done.has(i)}
            aria-label={`${unit} ${i + 1}: ${(stepAmount(ch, i) / 100).toLocaleString('en-PH')} pesos${done.has(i) ? ', done' : ''}`}
            title={`${unit} ${i + 1}: ₱${(stepAmount(ch, i) / 100).toLocaleString('en-PH')}`}
            className={`aspect-square rounded-[4px] text-[8px] font-semibold transition ${
              done.has(i)
                ? 'bg-accent text-white'
                : i === now
                  ? 'ring-accent bg-ink/[0.05] ring-2 dark:bg-white/[0.08]'
                  : i < now
                    ? 'bg-red-500/15'
                    : 'bg-ink/[0.06] dark:bg-white/[0.08]'
            }`}
          >
            {ch.steps <= 60 ? i + 1 : ''}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/45 dark:text-white/45">Tap a square when you've set that amount aside. Faded red = missed so far.</p>
    </GlassCard>
  )
}
