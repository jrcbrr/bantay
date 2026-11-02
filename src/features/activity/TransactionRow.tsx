import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { useAccounts, useCategories } from '@/db/hooks.ts'
import type { Transaction } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'

export function TransactionRow({ tx }: { tx: Transaction }) {
  const accounts = useAccounts()
  const categories = useCategories()
  const account = accounts.find((a) => a.id === tx.accountId)
  const to = accounts.find((a) => a.id === tx.toAccountId)
  const category = categories.find((c) => c.id === tx.categoryId)

  const title =
    tx.note || (tx.type === 'transfer' ? `${account?.name ?? '?'} → ${to?.name ?? '?'}` : (category?.name ?? 'Untitled'))
  const subtitle = tx.type === 'transfer' ? 'Transfer' : [category?.name, account?.name].filter(Boolean).join(' · ')
  const signed = tx.type === 'expense' ? -tx.amount : tx.type === 'income' ? tx.amount : 0
  const Icon = tx.type === 'income' ? ArrowUpRight : tx.type === 'expense' ? ArrowDownRight : ArrowLeftRight
  const iconStyle =
    tx.type === 'income'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      : tx.type === 'expense'
        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
        : 'bg-accent/15 text-accent dark:text-accent-soft'

  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconStyle}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-ink/50 dark:text-white/50">{subtitle}</p>
      </div>
      {tx.type === 'transfer' ? (
        <Amount value={tx.amount} className="text-sm text-ink/60 dark:text-white/60" />
      ) : (
        <Amount value={signed} sign tone="auto" className="text-sm font-semibold" />
      )}
    </li>
  )
}
