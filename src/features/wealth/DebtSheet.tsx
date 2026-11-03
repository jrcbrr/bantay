import { useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { showToast } from '@/app/toast.ts'
import { createDebt, deleteDebt, recordDebtPayment, removeDebtPayment } from '@/db/actions.ts'
import { db } from '@/db/db.ts'
import { debtStatus } from '@/domain/credit.ts'
import { fromISODate } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Debt, DebtDirection } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'
import { AmountInput, DangerButton, Field, PrimaryButton, ProgressBar, Segmented, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type DebtTarget = Debt | 'new' | null

const dayFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export function DebtSheet({ target, onClose }: { target: DebtTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? existing.person : 'New debt or IOU'}>
      {existing ? <DebtDetail debt={existing} onClose={onClose} /> : target === 'new' ? <NewDebtForm onClose={onClose} /> : null}
    </Sheet>
  )
}

function NewDebtForm({ onClose }: { onClose: () => void }) {
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me')
  const [person, setPerson] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')

  const amount = parseAmount(amountText)
  const valid = !!person.trim() && amount !== null

  const save = async () => {
    if (!valid || amount === null) return
    await createDebt({
      person: person.trim(),
      direction,
      principal: amount,
      note: note.trim() || undefined,
      dueDate: dueDate || undefined,
    })
    onClose()
  }

  const lent = direction === 'owed_to_me'
  return (
    <div className="space-y-5">
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          ['owed_to_me', 'They owe me'],
          ['i_owe', 'I owe them'],
        ]}
      />
      <Field label={lent ? 'Who borrowed' : 'Who you borrowed from'}>
        <TextInput value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name" autoFocus />
      </Field>
      <Field label="Amount" hint="Just for keeping track. It won't change your balances or net worth.">
        <AmountInput value={amountText} onChange={setAmountText} />
      </Field>
      <Field label="Pay back by (optional)">
        <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="For the field trip, pizza split…" />
      </Field>
      <div className="flex">
        <PrimaryButton disabled={!valid} onClick={() => void save()}>
          Save
        </PrimaryButton>
      </div>
    </div>
  )
}

function DebtDetail({ debt: initial, onClose }: { debt: Debt; onClose: () => void }) {
  // Follow live changes (payments, settling) instead of the snapshot that was tapped.
  const debt = useLiveQuery(() => db.debts.get(initial.id), [initial.id]) ?? initial
  const status = debtStatus(debt)
  const payments = debt.payments ?? []

  const [payText, setPayText] = useState('')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setPayText(status.remaining ? String(status.remaining / 100) : '')
    setArmed(false)
    // Only when switching to a different debt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt.id])

  const pay = parseAmount(payText)
  const lent = debt.direction === 'owed_to_me'

  const record = async () => {
    if (pay === null) return
    const undo = await recordDebtPayment(debt, Math.min(pay, status.remaining || pay))
    showToast('Payment recorded', undo)
    setPayText('')
  }

  const remove = async () => {
    if (!armed) return setArmed(true)
    await deleteDebt(debt)
    onClose()
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-ink/55 dark:text-white/55">{lent ? `${debt.person} still owes you` : `You still owe ${debt.person}`}</p>
        <Amount value={status.remaining} className="block text-3xl font-semibold tracking-tight" />
        <div className="mt-3">
          <ProgressBar ratio={status.ratio} tone="ok" />
        </div>
        <p className="mt-1.5 text-xs text-ink/50 dark:text-white/50">
          <Amount value={status.repaid} /> of <Amount value={debt.principal} /> paid back
          {debt.note && ` · ${debt.note}`}
        </p>
      </div>

      {debt.settled ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <Check size={18} /> All settled
          <button onClick={() => void db.debts.update(debt.id, { settled: false })} className="ml-auto text-xs font-semibold underline">
            Reopen
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
          <Field label={lent ? 'They paid me back' : 'I paid them back'}>
            <AmountInput value={payText} onChange={setPayText} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton disabled={pay === null} onClick={() => void record()}>
              Record payment
            </PrimaryButton>
          </div>
          <button
            onClick={() => void db.debts.update(debt.id, { settled: true })}
            className="w-full text-center text-xs font-medium text-ink/55 dark:text-white/55"
          >
            Mark as settled
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <Field label="Paybacks">
          <ul className="space-y-1">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-ink/60 dark:text-white/60">{dayFmt.format(fromISODate(p.date))}</span>
                <Amount value={p.amount} className="font-medium" />
                <button
                  aria-label="Remove this payment"
                  onClick={() => void removeDebtPayment(debt, p.id)}
                  className="rounded-full p-1.5 text-ink/35 hover:text-red-500 dark:text-white/35"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}

      <p className="text-xs text-ink/45 dark:text-white/45">Debts are for keeping track only. They don't change your balances or net worth.</p>

      <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete debt" />
    </div>
  )
}
