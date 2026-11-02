import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { addDays, toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { EventBudget } from '@/domain/planExtras.ts'
import { AmountInput, ColorPicker, DangerButton, Field, PrimaryButton, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type EventSheetTarget = EventBudget | 'new' | null

const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#16a34a', '#ef4444', '#2f6bff', '#27272a']

export function EventSheet({ target, onClose }: { target: EventSheetTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const [name, setName] = useState('')
  const [limitText, setLimitText] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [color, setColor] = useState(colors[0]!)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setName(existing?.name ?? '')
    setLimitText(existing ? String(existing.limit / 100) : '')
    setStart(existing?.start ?? toISODate(today()))
    setEnd(existing?.end ?? toISODate(addDays(today(), 2)))
    setColor(existing?.color ?? colors[0]!)
  }, [target, existing])

  const limit = parseAmount(limitText)
  const valid = !!name.trim() && limit !== null && !!start && !!end && start <= end

  const save = async () => {
    if (!valid || limit === null) return
    const fields = { name: name.trim(), limit, start, end, color }
    if (existing) await db.events.update(existing.id, fields)
    else await db.events.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.transaction('rw', db.events, db.transactions, async () => {
      // Keep the spending, just unlink it from the event.
      await db.transactions.where('eventId').equals(existing.id).modify((t) => {
        delete t.eventId
      })
      await db.events.delete(existing.id)
    })
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit event budget' : 'New event budget'}>
      <div className="space-y-5">
        <Field label="Event">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Field trip, Christmas, birthday…" autoFocus={!existing} />
        </Field>
        <Field label="Budget">
          <AmountInput value={limitText} onChange={setLimitText} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {start > end && <p className="-mt-3 text-xs text-red-500">The end date is before the start.</p>}
        <p className="-mt-2 text-xs text-ink/50 dark:text-white/50">
          While the event is on, spending you add gets a "Count toward" option so you choose what belongs to it.
        </p>
        <Field label="Color">
          <ColorPicker colors={colors} value={color} onChange={setColor} />
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete event" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add event'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
