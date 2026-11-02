import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { useAccounts, useCategories, useLookups, useTemplates } from '@/db/hooks.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Template, TransactionType } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, Segmented, TextInput, Toggle } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

type Target = Template | 'new' | null

export function TemplatesPage() {
  const templates = useTemplates()
  const lookups = useLookups()
  const [target, setTarget] = useState<Target>(null)

  return (
    <>
      <Link to="/settings" className="text-accent dark:text-accent-soft -mb-1 flex items-center gap-1 pt-2 text-sm font-medium">
        <ChevronLeft size={16} /> Settings
      </Link>
      <PageHeader title="Quick templates" subtitle="One-tap shortcuts in the + sheet" />

      <GlassCard className="p-2!">
        <ul>
          {templates.map((t) => {
            const cat = t.categoryId ? lookups.categories.get(t.categoryId) : undefined
            const acc = t.accountId ? lookups.accounts.get(t.accountId) : undefined
            return (
              <li key={t.id}>
                <button
                  onClick={() => setTarget(t)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04] ${
                    t.pinned ? '' : 'opacity-50'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] dark:bg-white/[0.07]">
                    {cat ? <CategoryIcon category={cat} size={18} /> : <Plus size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="truncate text-xs text-ink/50 dark:text-white/50">
                      {[t.type === 'income' ? 'Income' : t.type === 'transfer' ? 'Transfer' : 'Expense', cat?.name, acc?.name]
                        .filter(Boolean)
                        .join(' · ')}
                      {!t.pinned && ' · hidden'}
                    </p>
                  </div>
                  {t.amount ? <Amount value={t.amount} className="text-sm font-medium" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <button
          onClick={() => setTarget('new')}
          className="text-accent dark:text-accent-soft flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium"
        >
          <Plus size={18} /> Add template
        </button>
      </GlassCard>
      <p className="mt-3 px-1 text-xs text-ink/50 dark:text-white/50">
        Leave the amount empty if it changes each time; the template fills in everything else.
      </p>

      <TemplateSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}

function TemplateSheet({ target, onClose }: { target: Target; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const accounts = useAccounts()
  const categories = useCategories()

  const [label, setLabel] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [amountText, setAmountText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [pinned, setPinned] = useState(true)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setLabel(existing?.label ?? '')
    setType(existing?.type ?? 'expense')
    setAmountText(existing?.amount ? String(existing.amount / 100) : '')
    setAccountId(existing?.accountId ?? '')
    setToAccountId(existing?.toAccountId ?? '')
    setCategoryId(existing?.categoryId ?? '')
    setNote(existing?.note ?? '')
    setPinned(existing?.pinned ?? true)
  }, [target, existing])

  const amount = amountText.trim() === '' ? undefined : parseAmount(amountText)
  const valid = !!label.trim() && amount !== null

  const save = async () => {
    if (!valid || amount === null) return
    const fields = {
      label: label.trim(),
      type,
      amount,
      accountId: accountId || undefined,
      toAccountId: type === 'transfer' ? toAccountId || undefined : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId || undefined,
      note: note.trim() || undefined,
      pinned,
    }
    if (existing) await db.templates.update(existing.id, fields)
    else await db.templates.add({ id: newId(), ...fields })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.templates.delete(existing.id)
    onClose()
  }

  const accountChips = (exclude?: string) =>
    accounts.filter((a) => a.id !== exclude).map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const)

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit template' : 'New template'}>
      <div className="space-y-5">
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t)
            setCategoryId('')
          }}
          options={[
            ['expense', 'Expense'],
            ['income', 'Income'],
            ['transfer', 'Transfer'],
          ]}
        />
        <Field label="Button label">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Jeep, Lunch, Baon…" autoFocus={!existing} />
        </Field>
        <Field label="Amount (optional)">
          <AmountInput value={amountText} onChange={setAmountText} placeholder="Varies" />
        </Field>
        <Field label={type === 'income' ? 'Into' : 'From'}>
          <Chips items={[['', 'Any'] as const, ...accountChips()]} value={accountId} onChange={setAccountId} />
        </Field>
        {type === 'transfer' ? (
          <Field label="To">
            <Chips items={[['', 'Any'] as const, ...accountChips(accountId)]} value={toAccountId} onChange={setToAccountId} />
          </Field>
        ) : (
          <Field label="Category">
            <Chips
              items={categories
                .filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
                .map((c) => [c.id, c.name, <CategoryIcon key={c.id} category={c} />] as const)}
              value={categoryId}
              onChange={(v) => setCategoryId(v === categoryId ? '' : v)}
            />
          </Field>
        )}
        <Field label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fills the note field" />
        </Field>
        <div className="rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
          <Toggle checked={pinned} onChange={setPinned} label="Show in Quick Add" />
        </div>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete template" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add template'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
