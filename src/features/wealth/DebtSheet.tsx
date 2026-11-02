import { useEffect, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createDebt, deleteDebt, recordDebtPayment } from '@/db/actions.ts'
import { db } from '@/db/db.ts'
import { useAccounts, useTransactions } from '@/db/hooks.ts'
import { debtStatus } from '@/domain/credit.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Debt, DebtDirection } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { Amount } from '@/ui/Amount.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, ProgressBar, Segmented, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type DebtTarget = Debt | 'new' | null

export function DebtSheet({ target, onClose }: { target: DebtTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? existing.person : 'New debt or IOU'}>
      {existing ? <DebtDetail debt={existing} onClose={onClose} /> : target === 'new' ? <NewDebtForm onClose={onClose} /> : null}
    </Sheet>
  )
}

function NewDebtForm({ onClose }: { onClose: () => void }) {
  const accounts = useAccounts().filter((a) => a.kind !== 'credit')
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me')
  const [person, setPerson] = useState('')
  const [amountText, setAmountText] = useState('')
  const [accountId, setAccountId] = useState('')
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
      accountId: accountId || undefined,
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
      <Field label="Amount">
        <AmountInput value={amountText} onChange={setAmountText} />
      </Field>
      <Field
        label={lent ? 'Money came out of' : 'Money went into'}
        hint={accountId ? 'This moves the money in your account now.' : "Just tracking it. Your balances won't change."}
      >
        <Chips
          items={[
            ['', 'Just track it'] as const,
            ...accounts.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const),
          ]}
          value={accountId}
          onChange={setAccountId}
        />
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
  // Follow live changes (settling, reopening) instead of the snapshot that was tapped.
  const debt = useLiveQuery(() => db.debts.get(initial.id), [initial.id]) ?? initial
  const accounts = useAccounts().filter((a) => a.kind !== 'credit')
  const transactions = useTransactions()
  const status = debtStatus(debt, transactions)
  const linked = transactions.filter((t) => t.debtId === debt.id).length

  const [payText, setPayText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setPayText(status.remaining ? String(status.remaining / 100) : '')
    setArmed(false)
    // Only when switching to a different debt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt.id])

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  const pay = parseAmount(payText)
  const lent = debt.direction === 'owed_to_me'

  const record = async () => {
    if (pay === null || !accountId) return
    await recordDebtPayment(debt, Math.min(pay, status.remaining || pay), accountId)
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
          <Chips
            items={accounts.map((a) => [a.id, a.name, <AccountIcon key={a.id} account={a} size={20} />] as const)}
            value={accountId}
            onChange={setAccountId}
          />
          <div className="flex gap-2">
            <PrimaryButton disabled={pay === null || !accountId} onClick={() => void record()}>
              Record payment
            </PrimaryButton>
          </div>
          <button
            onClick={() => void db.debts.update(debt.id, { settled: true })}
            className="w-full text-center text-xs font-medium text-ink/55 dark:text-white/55"
          >
            Mark as settled without logging money
          </button>
        </div>
      )}

      <DangerButton
        armed={armed}
        onClick={() => void remove()}
        icon={<Trash2 size={18} />}
        armedLabel={linked ? `Delete it and its ${linked} transaction${linked === 1 ? '' : 's'}` : 'Tap to delete'}
        srLabel="Delete debt"
      />
    </div>
  )
}
