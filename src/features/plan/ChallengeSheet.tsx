import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import { challengeTotals, type Challenge, type ChallengeKind } from '@/domain/planExtras.ts'
import { Amount } from '@/ui/Amount.tsx'
import { AmountInput, DangerButton, Field, PrimaryButton, Segmented, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type ChallengeTarget = Challenge | 'new' | null

const presets: Record<ChallengeKind, { name: string; amount: string; steps: string }> = {
  'weekly-52': { name: '52-week ipon challenge', amount: '10', steps: '52' },
  daily: { name: '₱20 a day', amount: '20', steps: '100' },
  custom: { name: 'My ipon challenge', amount: '50', steps: '30' },
}

export function ChallengeSheet({ target, onClose }: { target: ChallengeTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const [kind, setKind] = useState<ChallengeKind>('weekly-52')
  const [name, setName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [startDate, setStartDate] = useState('')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    const k = existing?.kind ?? 'weekly-52'
    setKind(k)
    setName(existing?.name ?? presets[k].name)
    setAmountText(existing ? String(existing.amount / 100) : presets[k].amount)
    setStepsText(existing ? String(existing.steps) : presets[k].steps)
    setStartDate(existing?.startDate ?? toISODate(today()))
  }, [target, existing])

  const pickKind = (k: ChallengeKind) => {
    setKind(k)
    if (!existing) {
      setName(presets[k].name)
      setAmountText(presets[k].amount)
      setStepsText(presets[k].steps)
    }
  }

  const amount = parseAmount(amountText)
  const steps = kind === 'weekly-52' ? 52 : Number(stepsText)
  const valid = !!name.trim() && amount !== null && Number.isInteger(steps) && steps >= 2 && steps <= 400
  const preview =
    valid && amount !== null
      ? challengeTotals({ id: '', name, kind, amount, steps, startDate, done: [], createdAt: 0 }).target
      : null

  const save = async () => {
    if (!valid || amount === null) return
    const fields = { name: name.trim(), kind, amount, steps, startDate }
    if (existing) await db.challenges.update(existing.id, { ...fields, done: existing.done.filter((i) => i < steps) })
    else await db.challenges.add({ id: newId(), ...fields, done: [], createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.challenges.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit challenge' : 'New ipon challenge'}>
      <div className="space-y-5">
        <Segmented
          value={kind}
          onChange={pickKind}
          options={[
            ['weekly-52', '52 weeks'],
            ['daily', 'Daily'],
            ['custom', 'Custom'],
          ]}
        />
        <p className="-mt-2 text-xs text-ink/50 dark:text-white/50">
          {kind === 'weekly-52'
            ? 'Week 1 save the base amount, week 2 double it, and so on up to week 52.'
            : kind === 'daily'
              ? 'Save the same amount every day.'
              : 'Save the same amount for as many steps as you like (tick them off any time).'}
        </p>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === 'weekly-52' ? 'Week 1 amount' : 'Amount each time'}>
            <AmountInput value={amountText} onChange={setAmountText} />
          </Field>
          {kind !== 'weekly-52' && (
            <Field label={kind === 'daily' ? 'Days' : 'Steps'}>
              <TextInput inputMode="numeric" value={stepsText} onChange={(e) => setStepsText(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
          )}
        </div>
        <Field label="Start">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        {preview !== null && (
          <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm">
            Finish it and you'll have saved <Amount value={preview} className="font-semibold" />.
          </p>
        )}
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete challenge" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Start challenge'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
