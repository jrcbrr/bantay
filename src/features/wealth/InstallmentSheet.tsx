import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteInstallment } from '@/db/actions.ts'
import { db, newId } from '@/db/db.ts'
import { useAccounts } from '@/db/hooks.ts'
import { monthlyCharge } from '@/domain/credit.ts'
import { toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Installment } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type InstallmentTarget = Installment | { new: string } | null

const termChoices = ['3', '6', '9', '12', '18', '24', '36'] as const

export function InstallmentSheet({ target, onClose }: { target: InstallmentTarget; onClose: () => void }) {
  const existing = target && 'id' in target ? target : null
  const cards = useAccounts().filter((a) => a.kind === 'credit')

  const [label, setLabel] = useState('')
  const [cardId, setCardId] = useState('')
  const [totalText, setTotalText] = useState('')
  const [months, setMonths] = useState('12')
  const [startDate, setStartDate] = useState(toISODate(today()))
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setLabel(existing?.label ?? '')
    setCardId(existing?.cardAccountId ?? (target && 'new' in target ? target.new : ''))
    setTotalText(existing ? String(existing.total / 100) : '')
    setMonths(String(existing?.months ?? 12))
    setStartDate(existing?.startDate ?? toISODate(today()))
  }, [target, existing])

  const total = parseAmount(totalText)
  const m = Number(months)
  const valid = !!label.trim() && total !== null && !!cardId && Number.isInteger(m) && m >= 2 && m <= 60

  const save = async () => {
    if (!valid || total === null) return
    const fields = { label: label.trim(), cardAccountId: cardId, total, months: m, startDate }
    if (existing) await db.installments.update(existing.id, fields)
    else await db.installments.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await deleteInstallment(existing)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit installment' : 'New installment plan'}>
      <div className="space-y-5">
        <Field label="What did you buy">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Laptop, phone…" autoFocus={!existing} />
        </Field>
        <Field label="Total price">
          <AmountInput value={totalText} onChange={setTotalText} />
        </Field>
        <Field
          label="Months"
          hint={
            total !== null && m >= 2 ? (
              <>
                About <Amount value={monthlyCharge({ total, months: m })} /> a month
              </>
            ) : undefined
          }
        >
          <Chips items={termChoices.map((t) => [t, `${t} mo`] as const)} value={months} onChange={setMonths} />
        </Field>
        <Field label="First charge on">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Card">
          {cards.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-white/50">Add a credit card account first on the Wealth tab.</p>
          ) : (
            <Chips
              items={cards.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const)}
              value={cardId}
              onChange={setCardId}
            />
          )}
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete plan" srLabel="Delete plan" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add plan'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
