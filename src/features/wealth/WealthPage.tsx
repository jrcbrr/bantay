import { useState, type ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { logInstallmentCharge } from '@/db/actions.ts'
import { useDebts, useInstallments, useMoney } from '@/db/hooks.ts'
import { debtStatus, debtTotals, installmentStatus, nextCardDue } from '@/domain/credit.ts'
import { dueLabel } from '@/ui/dueLabel.ts'
import { ProgressBar } from '@/ui/form.tsx'
import { assetGain, assetGainRatio, assetTotals } from '@/domain/assets.ts'
import { isSpendable } from '@/domain/balance.ts'
import type { Account, AccountKind } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { PrivacyToggle } from '@/ui/PrivacyToggle.tsx'
import { AccountSheet, type AccountSheetTarget } from './AccountSheet.tsx'
import { AssetSheet, type AssetTarget } from './AssetSheet.tsx'
import { assetKindIcon } from './assetKinds.ts'
import { DebtSheet, type DebtTarget } from './DebtSheet.tsx'
import { InstallmentSheet, type InstallmentTarget } from './InstallmentSheet.tsx'

const kindLabel: Record<AccountKind, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-wallet',
  credit: 'Credit card',
}

function GroupTitle({ children, total }: { children: ReactNode; total?: number }) {
  return (
    <div className="mt-7 mb-2 flex items-baseline justify-between px-1">
      <h2 className="font-semibold">{children}</h2>
      {total !== undefined && <Amount value={total} className="text-sm text-ink/55 dark:text-white/55" />}
    </div>
  )
}

export function WealthPage() {
  const { accounts, balances, available, savings, owed, assets, assetsValue, worth, transactions } = useMoney()
  const debts = useDebts()
  const installments = useInstallments()
  const [debtTarget, setDebtTarget] = useState<DebtTarget>(null)
  const [instTarget, setInstTarget] = useState<InstallmentTarget>(null)
  const [showSettled, setShowSettled] = useState(false)
  const iou = debtTotals(debts)
  const openDebts = debts.filter((d) => !d.settled)
  const settledDebts = debts.filter((d) => d.settled)
  const [accountTarget, setAccountTarget] = useState<AccountSheetTarget>(null)
  const [assetTarget, setAssetTarget] = useState<AssetTarget>(null)

  const spendable = accounts.filter(isSpendable)
  const saved = accounts.filter((a) => a.kind !== 'credit' && a.savings)
  const credit = accounts.filter((a) => a.kind === 'credit')
  const assetSum = assetTotals(assets)

  const breakdown: [string, number, string][] = [
    ['Spendable', available, 'bg-accent'],
    ['Savings', savings, 'bg-teal-600'],
    ['Assets', assetsValue, 'bg-amber-600'],
  ]
  const positive = breakdown.reduce((s, [, v]) => s + Math.max(0, v), 0)

  const accountRow = (a: Account) => (
    <button
      key={a.id}
      onClick={() => setAccountTarget(a)}
      className="glass flex w-full items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[0.99]"
    >
      <AccountIcon account={a} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{a.name}</p>
        <p className="text-xs text-ink/50 dark:text-white/50">{kindLabel[a.kind]}</p>
      </div>
      <Amount value={balances.get(a.id) ?? 0} className="font-semibold" />
      <ChevronRight size={18} className="text-ink/30 dark:text-white/30" />
    </button>
  )

  return (
    <>
      <PageHeader title="Wealth" subtitle="Accounts & assets" action={<PrivacyToggle />} />

      <GlassCard>
        <p className="text-sm text-ink/55 dark:text-white/55">Net worth</p>
        <Amount value={worth} className="mt-1 block text-3xl font-semibold tracking-tight sm:text-4xl" />
        {positive > 0 && (
          <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {breakdown.map(([name, v, color]) =>
              v > 0 ? <div key={name} className={color} style={{ width: `${(v / positive) * 100}%` }} /> : null,
            )}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {breakdown.map(([name, v, color]) => (
            <div key={name}>
              <p className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50">
                <span className={`h-2 w-2 rounded-full ${color}`} /> {name}
              </p>
              <Amount value={v} className="font-medium" />
            </div>
          ))}
          <div>
            <p className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Owed
            </p>
            <Amount value={owed} className="font-medium" />
          </div>
        </div>
      </GlassCard>

      <GroupTitle total={available}>Spendable</GroupTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{spendable.map(accountRow)}</div>

      {saved.length > 0 && (
        <>
          <GroupTitle total={savings}>Savings</GroupTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{saved.map(accountRow)}</div>
        </>
      )}

      {credit.length > 0 && (
        <>
          <GroupTitle total={-owed}>Credit cards</GroupTitle>
          <div className="space-y-3">
            {credit.map((card) => {
              const bal = -(balances.get(card.id) ?? 0)
              const plans = installments.filter((i) => i.cardAccountId === card.id)
              return (
                <div key={card.id} className="space-y-2">
                  {accountRow(card)}
                  <div className="glass space-y-3 rounded-3xl p-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55 dark:text-white/55">
                      {card.dueDay ? <span>Bill due {dueLabel(nextCardDue(card.dueDay, new Date())).toLowerCase()}</span> : <span>Set a due day in the card's settings</span>}
                      {card.creditLimit ? (
                        <span>
                          <Amount value={Math.max(0, card.creditLimit - bal)} /> available of <Amount value={card.creditLimit} />
                        </span>
                      ) : null}
                    </div>
                    {card.creditLimit ? (
                      <ProgressBar
                        ratio={bal / card.creditLimit}
                        tone={bal / card.creditLimit > 0.9 ? 'over' : bal / card.creditLimit > 0.3 ? 'warning' : 'ok'}
                      />
                    ) : null}
                    {plans.map((inst) => {
                      const st = installmentStatus(inst, transactions)
                      return (
                        <div key={inst.id} className="flex items-center gap-3 border-t border-ink/5 pt-3 dark:border-white/5">
                          <button onClick={() => setInstTarget(inst)} className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium">{inst.label}</p>
                            <p className="text-xs text-ink/50 dark:text-white/50">
                              {st.paidMonths}/{inst.months} months · <Amount value={st.remaining} /> left
                              {st.next && <> · next {dueLabel(st.next.date).toLowerCase()}</>}
                            </p>
                            <div className="mt-1.5">
                              <ProgressBar ratio={st.paidMonths / inst.months} tone="accent" />
                            </div>
                          </button>
                          {st.next ? (
                            <button
                              onClick={() => void logInstallmentCharge(inst)}
                              className="shrink-0 rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold dark:bg-white/[0.08]"
                              title="Logs this month's charge on the card"
                            >
                              Log <Amount value={st.next.amount} compact />
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Done</span>
                          )}
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setInstTarget({ new: card.id })}
                      className="text-accent dark:text-accent-soft flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Plus size={14} /> Installment plan
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <button
        onClick={() => setAccountTarget('new')}
        className="hover:border-accent/50 hover:text-accent mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 p-4 text-sm font-medium text-ink/55 transition dark:border-white/15 dark:text-white/55"
      >
        <Plus size={18} /> Add account
      </button>

      <div className="mt-7 mb-2 flex items-center justify-between px-1">
        <h2 className="font-semibold">Debts & IOUs</h2>
        <button
          onClick={() => setDebtTarget('new')}
          aria-label="Add debt or IOU"
          className="bg-accent/12 text-accent dark:text-accent-soft flex h-8 w-8 items-center justify-center rounded-full"
        >
          <Plus size={18} />
        </button>
      </div>
      {debts.length === 0 ? (
        <GlassCard>
          <p className="py-2 text-center text-sm text-ink/50 dark:text-white/50">
            Lent someone money or borrowed some? Track it here so nobody forgets.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="p-2!">
          <div className="grid grid-cols-2 gap-2 p-2">
            <div className="rounded-2xl bg-emerald-500/10 px-3 py-2">
              <p className="text-xs text-ink/50 dark:text-white/50">Owed to you</p>
              <Amount value={iou.owedToMe} className="font-semibold text-emerald-700 dark:text-emerald-300" />
            </div>
            <div className="rounded-2xl bg-red-500/10 px-3 py-2">
              <p className="text-xs text-ink/50 dark:text-white/50">You owe</p>
              <Amount value={iou.iOwe} className="font-semibold text-red-700 dark:text-red-300" />
            </div>
          </div>
          <ul>
            {[...openDebts, ...(showSettled ? settledDebts : [])].map((d) => {
              const st = debtStatus(d)
              const lent = d.direction === 'owed_to_me'
              return (
                <li key={d.id}>
                  <button
                    onClick={() => setDebtTarget(d)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04] ${
                      d.settled ? 'opacity-50' : ''
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        lent
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-500/15 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {d.person.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.person}</p>
                      <p className="truncate text-xs text-ink/50 dark:text-white/50">
                        {d.settled ? 'Settled' : lent ? 'Owes you' : 'You owe'}
                        {!d.settled && d.dueDate && ` · ${dueLabel(d.dueDate).toLowerCase()}`}
                        {d.note && ` · ${d.note}`}
                      </p>
                    </div>
                    <Amount value={d.settled ? d.principal : st.remaining} className="text-sm font-semibold" />
                  </button>
                </li>
              )
            })}
          </ul>
          {settledDebts.length > 0 && (
            <button
              onClick={() => setShowSettled((v) => !v)}
              className="w-full py-2 text-center text-xs font-medium text-ink/50 dark:text-white/50"
            >
              {showSettled ? 'Hide settled' : `Show ${settledDebts.length} settled`}
            </button>
          )}
        </GlassCard>
      )}

      <div className="mt-7 mb-2 flex items-center justify-between px-1">
        <h2 className="font-semibold">Assets</h2>
        <button
          onClick={() => setAssetTarget('new')}
          aria-label="Add asset"
          className="bg-accent/12 text-accent dark:text-accent-soft flex h-8 w-8 items-center justify-center rounded-full"
        >
          <Plus size={18} />
        </button>
      </div>
      {assets.length === 0 ? (
        <GlassCard>
          <p className="py-2 text-center text-sm text-ink/50 dark:text-white/50">
            Log things you own, like your phone, laptop, bike or collectibles, to see what they're worth now.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="p-2!">
          <div className="flex items-center justify-between px-3 pt-2 pb-1 text-xs text-ink/50 dark:text-white/50">
            <span>
              Worth <Amount value={assetSum.value} /> · paid <Amount value={assetSum.cost} />
            </span>
            <Amount value={assetSum.gain} sign tone="auto" className="font-medium" />
          </div>
          <ul>
            {assets.map((a) => {
              const Icon = assetKindIcon(a.kind)
              const gain = assetGain(a)
              const pct = Math.round(assetGainRatio(a) * 100)
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setAssetTarget(a)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    {a.photo ? (
                      <img src={a.photo} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Icon size={20} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-ink/50 dark:text-white/50">
                        Paid <Amount value={a.purchasePrice} />
                      </p>
                    </div>
                    <div className="text-right">
                      <Amount value={a.currentValue} className="block text-sm font-semibold" />
                      {gain !== 0 && (
                        <span className="text-xs">
                          <Amount value={gain} sign tone="auto" compact /> ({pct > 0 ? '+' : ''}
                          {pct}%)
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </GlassCard>
      )}

      <AccountSheet target={accountTarget} activeCount={accounts.length} onClose={() => setAccountTarget(null)} />
      <AssetSheet target={assetTarget} onClose={() => setAssetTarget(null)} />
      <DebtSheet target={debtTarget} onClose={() => setDebtTarget(null)} />
      <InstallmentSheet target={instTarget} onClose={() => setInstTarget(null)} />
    </>
  )
}
