import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { parseAmount } from '@/domain/money.ts'
import type { WishItem } from '@/domain/types.ts'
import { AmountInput, DangerButton, Field, PrimaryButton, Segmented, TextInput, Toggle } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type WishTarget = WishItem | 'new' | null

export const priorityLabel: Record<WishItem['priority'], string> = { 1: 'Need', 2: 'Want', 3: 'Nice to have' }

export function WishSheet({ target, onClose }: { target: WishTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [priority, setPriority] = useState<'1' | '2' | '3'>('2')
  const [note, setNote] = useState('')
  const [bought, setBought] = useState(false)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setName(existing?.name ?? '')
    setPriceText(existing ? String(existing.price / 100) : '')
    setPriority(String(existing?.priority ?? 2) as '1' | '2' | '3')
    setNote(existing?.note ?? '')
    setBought(!!existing?.bought)
  }, [target, existing])

  const price = parseAmount(priceText)
  const valid = !!name.trim() && price !== null

  const save = async () => {
    if (!valid || price === null) return
    const fields = { name: name.trim(), price, priority: Number(priority) as WishItem['priority'], note: note.trim() || undefined, bought }
    if (existing) await db.wishlist.update(existing.id, fields)
    else await db.wishlist.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.wishlist.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit wish' : 'Add to wishlist'}>
      <div className="space-y-5">
        <Field label="What">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Headphones, shoes, a book…" autoFocus={!existing} />
        </Field>
        <Field label="Price">
          <AmountInput value={priceText} onChange={setPriceText} />
        </Field>
        <Field label="How much do you need it">
          <Segmented
            value={priority}
            onChange={setPriority}
            options={[
              ['1', priorityLabel[1]],
              ['2', priorityLabel[2]],
              ['3', priorityLabel[3]],
            ]}
          />
        </Field>
        <Field label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where to buy, size, color…" />
        </Field>
        {existing && (
          <div className="rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
            <Toggle checked={bought} onChange={setBought} label="Already bought" />
          </div>
        )}
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete wish" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
