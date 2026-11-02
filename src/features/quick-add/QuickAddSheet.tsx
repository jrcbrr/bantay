import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '@/db/db.ts'
import { useAccounts, useCategories } from '@/db/hooks.ts'
import { toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Template, TransactionType } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'

interface Props {
  open: boolean
  onClose: () => void
}

const types: [TransactionType, string][] = [
  ['expense', 'Expense'],
  ['income', 'Income'],
  ['transfer', 'Transfer'],
]

export function QuickAddSheet({ open, onClose }: Props) {
  const accounts = useAccounts()
  const categories = useCategories()
  const templates = useLiveQuery(() => db.templates.filter((t) => !!t.pinned).toArray(), []) ?? []

  const [type, setType] = useState<TransactionType>('expense')
  const [amountText, setAmountText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => toISODate(today()))

  // Reset each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setType('expense')
    setAmountText('')
    setNote('')
    setCategoryId('')
    setDate(toISODate(today()))
  }, [open])

  // Default to the first account once accounts load.
  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
    if (!toAccountId && accounts[1]) setToAccountId(accounts[1].id)
  }, [accounts, accountId, toAccountId])

  const amount = parseAmount(amountText)
  const visibleCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
  const canSave =
    amount !== null && !!accountId && (type !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const applyTemplate = (t: Template) => {
    setType(t.type)
    if (t.amount) setAmountText(String(t.amount / 100))
    if (t.accountId) setAccountId(t.accountId)
    if (t.toAccountId) setToAccountId(t.toAccountId)
    setCategoryId(t.categoryId ?? '')
    setNote(t.note ?? '')
  }

  const save = async () => {
    if (!canSave || amount === null) return
    await db.transactions.add({
      id: newId(),
      type,
      amount,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId || undefined,
      note: note.trim() || undefined,
      date,
      createdAt: Date.now(),
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add transaction"
            className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[2rem] bg-paper/80! p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-6 md:rounded-[2rem] dark:bg-ink/80!"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
                {types.map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setType(v)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      type === v ? 'bg-accent text-white shadow' : 'text-ink/55 dark:text-white/55'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-ink/5 dark:hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            {templates.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="shrink-0 rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent dark:text-accent-soft"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <label className="block">
              <span className="sr-only">Amount</span>
              <div className="flex items-baseline gap-1 border-b border-ink/10 pb-2 dark:border-white/10">
                <span className="text-2xl text-ink/40 dark:text-white/40">₱</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  placeholder="0"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void save()}
                  className="tabular w-full bg-transparent text-5xl font-semibold tracking-tight outline-none placeholder:text-ink/20 dark:placeholder:text-white/20"
                />
              </div>
            </label>

            <Section title={type === 'income' ? 'Into' : 'From'}>
              <Chips
                items={accounts.map((a) => [a.id, a.name, <AccountIcon account={a} size={20} />])}
                value={accountId}
                onChange={setAccountId}
              />
            </Section>

            {type === 'transfer' ? (
              <Section title="To">
                <Chips
                  items={accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => [a.id, a.name, <AccountIcon account={a} size={20} />])}
                  value={toAccountId}
                  onChange={setToAccountId}
                />
              </Section>
            ) : (
              <Section title="Category">
                <Chips
                  items={visibleCategories.map((c) => [c.id, c.name])}
                  value={categoryId}
                  onChange={(v) => setCategoryId(v === categoryId ? '' : v)}
                />
              </Section>
            )}

            <div className="mt-4 flex gap-2">
              <input
                placeholder="Note (e.g. McDo)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 rounded-xl bg-ink/[0.05] px-3 py-2.5 text-sm outline-none dark:bg-white/[0.07]"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl bg-ink/[0.05] px-3 py-2.5 text-sm outline-none dark:bg-white/[0.07]"
              />
            </div>

            <button
              disabled={!canSave}
              onClick={() => void save()}
              className="bg-accent mt-5 w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-accent/30 transition active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
            >
              Save
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">{title}</p>
      {children}
    </div>
  )
}

function Chips({
  items,
  value,
  onChange,
}: {
  items: [id: string, label: string, icon?: ReactNode][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([id, label, icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 rounded-full py-1.5 text-sm transition ${icon ? 'pr-3 pl-1.5' : 'px-3'} ${
            value === id
              ? 'bg-ink text-white dark:bg-white dark:text-ink'
              : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}
