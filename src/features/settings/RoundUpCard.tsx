import { Coins } from 'lucide-react'
import { db } from '@/db/db.ts'
import { useAccounts, useSettings, useTransactions } from '@/db/hooks.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { Chips, Segmented, Toggle } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'

export function RoundUpCard() {
  const settings = useSettings()
  const accounts = useAccounts().filter((a) => a.kind !== 'credit')
  const transactions = useTransactions()
  const ru = settings?.roundUp
  const savingsAccounts = accounts.filter((a) => a.savings)
  const choices = savingsAccounts.length ? savingsAccounts : accounts

  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = transactions.filter((t) => t.roundUpOf && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0)

  const set = (next: { toPesos: number; accountId: string } | undefined) => db.settings.update('app', { roundUp: next })

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center gap-3">
        <Coins size={20} className="text-accent dark:text-accent-soft" />
        <div className="flex-1">
          <h2 className="font-semibold">Round-up savings</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">
            {ru ? (
              <>
                <Amount value={thisMonth} /> saved from spare change this month
              </>
            ) : (
              'Spend ₱189, save ₱1 — the change goes to savings'
            )}
          </p>
        </div>
      </div>
      <Toggle
        checked={!!ru}
        onChange={(on) => {
          const target = choices[0]
          void set(on && target ? { toPesos: 10, accountId: target.id } : undefined)
        }}
        label="Round up every expense"
        hint="Adds a small transfer to savings each time you log spending"
      />
      {ru && (
        <>
          <Segmented
            value={String(ru.toPesos) as '10' | '50' | '100'}
            onChange={(v) => void set({ ...ru, toPesos: Number(v) })}
            options={[
              ['10', 'To ₱10'],
              ['50', 'To ₱50'],
              ['100', 'To ₱100'],
            ]}
          />
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">Put it in</p>
            <Chips
              items={choices.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const)}
              value={ru.accountId}
              onChange={(id) => void set({ ...ru, accountId: id })}
            />
            {savingsAccounts.length === 0 && (
              <p className="mt-2 text-xs text-ink/50 dark:text-white/50">
                Tip: add an account and switch on "Savings account" in Wealth, so round-ups stay out of safe to spend.
              </p>
            )}
          </div>
        </>
      )}
    </GlassCard>
  )
}
