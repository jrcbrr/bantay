import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { useMoney } from '@/db/hooks.ts'
import { netWorth } from '@/domain/balance.ts'
import type { AccountKind } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { AccountSheet, type AccountSheetTarget } from './AccountSheet.tsx'

const kindLabel: Record<AccountKind, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-wallet',
  credit: 'Credit card',
}

export function WalletsPage() {
  const { accounts, balances } = useMoney()
  const [target, setTarget] = useState<AccountSheetTarget>(null)

  return (
    <>
      <PageHeader
        title="Wallets"
        subtitle="Tap an account to edit it"
        action={
          <div className="text-right">
            <p className="text-xs text-ink/50 dark:text-white/50">Net worth</p>
            <Amount value={netWorth(accounts, balances)} className="text-lg font-semibold" />
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setTarget(a)}
            className="glass flex items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[0.99]"
          >
            <AccountIcon account={a} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{a.name}</p>
              <p className="text-xs text-ink/50 dark:text-white/50">{kindLabel[a.kind]}</p>
            </div>
            <Amount value={balances.get(a.id) ?? 0} className="text-lg font-semibold" />
            <ChevronRight size={18} className="text-ink/30 dark:text-white/30" />
          </button>
        ))}
        <button
          onClick={() => setTarget('new')}
          className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 p-4 text-sm font-medium text-ink/55 transition hover:border-accent/50 hover:text-accent dark:border-white/15 dark:text-white/55"
        >
          <Plus size={18} /> Add account
        </button>
      </div>
      <AccountSheet target={target} activeCount={accounts.length} onClose={() => setTarget(null)} />
    </>
  )
}
