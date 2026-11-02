import { useState, type ReactNode } from 'react'
import { CalendarClock, Check, Plus, Target, Wallet } from 'lucide-react'
import { markPaid } from '@/db/actions.ts'
import { useBudgets, useGoals, useLookups, useMoney } from '@/db/hooks.ts'
import { budgetProgress } from '@/domain/budgets.ts'
import { daysBetween, fromISODate, today } from '@/domain/dates.ts'
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
  const { transactions, recurring, balances } = useMoney()
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
      <PageHeader title="Plan" subtitle="Budgets, goals & bills" />
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
