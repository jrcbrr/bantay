import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { useAccounts } from '@/db/hooks.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Goal } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { AmountInput, Chips, ColorPicker, DangerButton, Field, PrimaryButton, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type GoalTarget = Goal | 'new' | null

const goalColors = ['#2f6bff', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#ef4444', '#27272a']

export function GoalSheet({ target, onClose }: { target: GoalTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const accounts = useAccounts().filter((a) => a.kind !== 'credit')

  const [name, setName] = useState('')
  const [targetText, setTargetText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState(goalColors[0]!)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setName(existing?.name ?? '')
    setTargetText(existing ? String(existing.target / 100) : '')
    setSavedText(existing?.saved ? String(existing.saved / 100) : '')
    setAccountId(existing?.accountId ?? '')
    setDeadline(existing?.deadline ?? '')
    setColor(existing?.color ?? goalColors[0]!)
  }, [target, existing])

  const goalAmount = parseAmount(targetText)
  const saved = savedText.trim() === '' ? 0 : parseAmount(savedText)
  const valid = !!name.trim() && goalAmount !== null && saved !== null

  const save = async () => {
    if (!valid || goalAmount === null || saved === null) return
    const fields = {
      name: name.trim(),
      target: goalAmount,
      saved,
      accountId: accountId || undefined,
      deadline: deadline || undefined,
      color,
    }
    if (existing) await db.goals.update(existing.id, fields)
    else await db.goals.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.goals.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit goal' : 'New savings goal'}>
      <div className="space-y-5">
        <Field label="What for">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="New phone, concert ticket…" autoFocus={!existing} />
        </Field>
        <Field label="Target">
          <AmountInput value={targetText} onChange={setTargetText} />
        </Field>
        <Field
          label="Track with"
          hint={accountId ? "Progress follows this account's balance." : 'Update the amount yourself whenever you save.'}
        >
          <Chips
            items={[
              ['', 'Manual'] as const,
              ...accounts.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const),
            ]}
            value={accountId}
            onChange={setAccountId}
          />
        </Field>
        {!accountId && (
          <Field label="Saved so far">
            <AmountInput value={savedText} onChange={setSavedText} />
          </Field>
        )}
        <Field label="Deadline (optional)">
          <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Field label="Color">
          <ColorPicker colors={goalColors} value={color} onChange={setColor} />
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete goal" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add goal'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
