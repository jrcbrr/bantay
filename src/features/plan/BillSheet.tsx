import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { useAccounts, useCategories } from '@/db/hooks.ts'
import { fromISODate, toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Frequency, Recurring } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, Segmented, TextInput, Toggle } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type BillTarget = Recurring | 'new' | null

export function BillSheet({ target, onClose }: { target: BillTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const accounts = useAccounts()
  const categories = useCategories()

  const [label, setLabel] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amountText, setAmountText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [nextDue, setNextDue] = useState(toISODate(today()))
  const [isSubscription, setIsSubscription] = useState(true)
  const [active, setActive] = useState(true)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setLabel(existing?.label ?? '')
    setType(existing?.type === 'income' ? 'income' : 'expense')
    setAmountText(existing ? String(existing.amount / 100) : '')
    setAccountId(existing?.accountId ?? '')
    setCategoryId(existing?.categoryId ?? (existing ? '' : 'subscriptions'))
    setFrequency(existing?.frequency ?? 'monthly')
    setNextDue(existing?.nextDue ?? toISODate(today()))
    setIsSubscription(existing ? !!existing.isSubscription : true)
    setActive(existing?.active ?? true)
  }, [target, existing])

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  const amount = parseAmount(amountText)
  const valid = !!label.trim() && amount !== null && !!accountId && !!nextDue
  const shownCategories = categories.filter((c) => c.kind === type)

  const save = async () => {
    if (!valid || amount === null) return
    const fields = {
      label: label.trim(),
      type,
      amount,
      accountId,
      categoryId: categoryId || undefined,
      frequency,
      nextDue,
      anchorDay: fromISODate(nextDue).getDate(),
      isSubscription: type === 'expense' && isSubscription,
      active,
    }
    if (existing) await db.recurring.update(existing.id, fields)
    else await db.recurring.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.recurring.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit recurring' : 'New bill or subscription'}>
      <div className="space-y-5">
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t)
            setCategoryId('')
          }}
          options={[
            ['expense', 'Bill / subscription'],
            ['income', 'Recurring income'],
          ]}
        />
        <Field label="Name">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Spotify, school fee, dorm rent…" autoFocus={!existing} />
        </Field>
        <Field label="Amount">
          <AmountInput value={amountText} onChange={setAmountText} />
        </Field>
        <Field label="Repeats">
          <Segmented
            value={frequency}
            onChange={setFrequency}
            options={[
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
            ]}
          />
        </Field>
        <Field label="Next due">
          <TextInput type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
        </Field>
        <Field label={type === 'income' ? 'Goes into' : 'Paid from'}>
          <Chips
            items={accounts.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const)}
            value={accountId}
            onChange={setAccountId}
          />
        </Field>
        <Field label="Category">
          <Chips
            items={shownCategories.map((c) => [c.id, c.name, <CategoryIcon key={c.id} category={c} />] as const)}
            value={categoryId}
            onChange={(v) => setCategoryId(v === categoryId ? '' : v)}
          />
        </Field>
        <div className="space-y-4 rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
          {type === 'expense' && (
            <Toggle
              checked={isSubscription}
              onChange={setIsSubscription}
              label="Subscription"
              hint="Shows in your subscriptions total"
            />
          )}
          <Toggle checked={active} onChange={setActive} label="Active" hint="Paused items don't count toward safe to spend" />
        </div>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
