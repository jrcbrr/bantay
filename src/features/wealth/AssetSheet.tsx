import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Asset, AssetKind } from '@/domain/types.ts'
import { imageFileToIcon } from '@/ui/AccountIcon.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, TextInput } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'
import { assetKinds } from './assetKinds.ts'

export type AssetTarget = Asset | 'new' | null

export function AssetSheet({ target, onClose }: { target: AssetTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const fileInput = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<AssetKind>('gadget')
  const [paidText, setPaidText] = useState('')
  const [valueText, setValueText] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setName(existing?.name ?? '')
    setKind(existing?.kind ?? 'gadget')
    setPaidText(existing ? String(existing.purchasePrice / 100) : '')
    setValueText(existing ? String(existing.currentValue / 100) : '')
    setPurchaseDate(existing?.purchaseDate ?? '')
    setPhoto(existing?.photo)
    setNote(existing?.note ?? '')
  }, [target, existing])

  const paid = paidText.trim() === '' ? 0 : parseAmount(paidText)
  // Current value defaults to what you paid.
  const value = valueText.trim() === '' ? paid : parseAmount(valueText)
  const valid = !!name.trim() && paid !== null && value !== null

  const save = async () => {
    if (!valid || paid === null || value === null) return
    const fields = {
      name: name.trim(),
      kind,
      purchasePrice: paid,
      currentValue: value,
      purchaseDate: purchaseDate || undefined,
      photo,
      note: note.trim() || undefined,
    }
    if (existing) await db.assets.update(existing.id, fields)
    else await db.assets.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.assets.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit asset' : 'New asset'}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInput.current?.click()}
            aria-label="Add photo"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink/[0.05] dark:bg-white/[0.07]"
          >
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={22} className="text-ink/40 dark:text-white/40" />}
          </button>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 15, bike, Pokémon cards…" autoFocus={!existing} />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) setPhoto(await imageFileToIcon(file, 256).catch(() => photo))
            }}
          />
        </div>
        <Field label="Type">
          <Chips items={assetKinds.map(([k, text, Icon]) => [k, text, <Icon key={k} size={16} />] as const)} value={kind} onChange={(v) => setKind(v as AssetKind)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid">
            <AmountInput value={paidText} onChange={setPaidText} />
          </Field>
          <Field label="Worth now">
            <AmountInput value={valueText} onChange={setValueText} placeholder={paid ? String(paid / 100) : '0'} />
          </Field>
        </div>
        <Field label="Bought on (optional)">
          <TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condition, serial, where it's kept…" />
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete asset" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add asset'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
