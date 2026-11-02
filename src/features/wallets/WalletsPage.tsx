import { CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { useMoney } from '@/db/hooks.ts'
import { netWorth } from '@/domain/balance.ts'
import type { AccountKind } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'

const kindIcon: Record<AccountKind, LucideIcon> = {
  cash: Wallet,
  bank: Landmark,
  ewallet: Smartphone,
  credit: CreditCard,
}

const kindLabel: Record<AccountKind, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-wallet',
  credit: 'Credit card',
}

export function WalletsPage() {
  const { accounts, balances } = useMoney()

  return (
    <>
      <PageHeader
        title="Wallets"
        subtitle="Accounts & balances"
        action={
          <div className="text-right">
            <p className="text-xs text-ink/50 dark:text-white/50">Net worth</p>
            <Amount value={netWorth(accounts, balances)} className="text-lg font-semibold" />
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => {
          const Icon = kindIcon[a.kind]
          return (
            <GlassCard key={a.id} className="flex items-center gap-4">
              <span className="bg-accent/12 text-accent dark:text-accent-soft flex h-12 w-12 items-center justify-center rounded-2xl">
                <Icon size={22} />
              </span>
              <div className="flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-ink/50 dark:text-white/50">{kindLabel[a.kind]}</p>
              </div>
              <Amount value={balances.get(a.id) ?? 0} className="text-lg font-semibold" />
            </GlassCard>
          )
        })}
      </div>
      <p className="mt-6 text-center text-xs text-ink/40 dark:text-white/40">
        Adding accounts, cards, installments and IOUs comes in upcoming milestones.
      </p>
    </>
  )
}
