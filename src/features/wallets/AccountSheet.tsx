import { useEffect, useRef, useState } from 'react'
import { Archive, Check, ImagePlus, Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Account, AccountKind } from '@/domain/types.ts'
import { AccountIcon, accountColors, accountIcons, imageFileToIcon } from '@/ui/AccountIcon.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type AccountSheetTarget = Account | 'new' | null

interface Props {
  target: AccountSheetTarget
  /** How many active accounts exist; the last one can't be archived. */
  activeCount: number
  onClose: () => void
}

const kinds: [AccountKind, string][] = [
  ['cash', 'Cash'],
  ['ewallet', 'E-wallet'],
  ['bank', 'Bank'],
  ['credit', 'Credit card'],
]

const label = 'mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45'
const field = 'rounded-xl bg-ink/[0.05] px-3 py-3 outline-none dark:bg-white/[0.07]'

export function AccountSheet({ target, activeCount, onClose }: Props) {
  const isNew = target === 'new'
  const account = target && target !== 'new' ? target : null

  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('cash')
  const [startText, setStartText] = useState('')
  const [icon, setIcon] = useState<string | undefined>()
  const [color, setColor] = useState<string | undefined>()
  const [iconImage, setIconImage] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!target) return
    setError('')
    setConfirmArchive(false)
    if (target === 'new') {
      setName('')
      setKind('ewallet')
      setStartText('')
      setIcon(undefined)
      setColor('#2f6bff')
      setIconImage(undefined)
    } else {
      setName(target.name)
      setKind(target.kind)
      const start = Math.abs(target.openingBalance)
      setStartText(start ? String(start / 100) : '')
      setIcon(target.icon)
      setColor(target.color)
      setIconImage(target.iconImage)
    }
  }, [target])

  const startAmount = startText.trim() === '' ? 0 : parseAmount(startText)
  const valid = !!name.trim() && startAmount !== null
  const preview = { name, kind, icon, color, iconImage }

  const onPickImage = async (file: File | undefined) => {
    if (!file) return
    try {
      setIconImage(await imageFileToIcon(file))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use that image')
    }
  }

  const save = async () => {
    if (!valid || startAmount === null) return
    // Credit card balances are money owed, so store them as negative.
    const openingBalance = kind === 'credit' ? -startAmount : startAmount
    const fields = { name: name.trim(), kind, openingBalance, icon, color, iconImage }
    if (account) await db.accounts.update(account.id, fields)
    else await db.accounts.add({ id: newId(), ...fields, createdAt: Date.now() })
    onClose()
  }

  const archive = async () => {
    if (!account) return
    if (!confirmArchive) return setConfirmArchive(true)
    await db.accounts.update(account.id, { archived: true })
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? 'New account' : 'Edit account'}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <AccountIcon account={preview} size={64} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name (e.g. Maya, BPI)"
            autoFocus={isNew}
            className={`${field} flex-1 font-medium`}
          />
        </div>

        <div>
          <p className={label}>Type</p>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
            {kinds.map(([k, text]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-lg py-2 text-xs font-medium transition ${
                  kind === k ? 'bg-white text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/55 dark:text-white/55'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>{kind === 'credit' ? 'Amount owed when added' : 'Starting balance'}</p>
          <div className={`${field} flex items-baseline gap-1`}>
            <span className="text-ink/40 dark:text-white/40">₱</span>
            <input
              inputMode="decimal"
              placeholder="0"
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              className="tabular w-full bg-transparent font-medium outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink/45 dark:text-white/45">
            {startAmount === null
              ? 'Enter an amount like 250 or 1,500.'
              : 'What was in it before you started tracking. Transactions add and subtract from here.'}
          </p>
        </div>

        <div>
          <p className={label}>Your own image</p>
          <div className="flex gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-ink/[0.05] px-3 py-2 text-sm font-medium dark:bg-white/[0.07]"
            >
              <ImagePlus size={16} /> {iconImage ? 'Change image' : 'Upload image'}
            </button>
            {iconImage && (
              <button
                onClick={() => setIconImage(undefined)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink/60 dark:text-white/60"
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPickImage(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <fieldset disabled={!!iconImage} className="space-y-5 transition-opacity disabled:opacity-40">
          <div>
            <p className={label}>Icon</p>
            <div className="grid grid-cols-8 gap-2">
              {Object.entries(accountIcons).map(([key, Icon]) => (
                <button
                  key={key}
                  aria-label={key}
                  onClick={() => setIcon(key)}
                  className={`flex aspect-square items-center justify-center rounded-xl transition ${
                    icon === key
                      ? 'bg-accent text-white'
                      : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
                  }`}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>Color</p>
            <div className="grid grid-cols-8 gap-2">
              {accountColors.map((c) => (
                <button
                  key={c}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className="flex aspect-square items-center justify-center rounded-full transition"
                  style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}55` : undefined }}
                >
                  {color === c && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <div className="flex gap-2">
          {account && activeCount > 1 && (
            <button
              onClick={() => void archive()}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                confirmArchive ? 'bg-red-600 text-white' : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
              }`}
            >
              <Archive size={18} />
              {confirmArchive ? 'Tap to archive' : <span className="sr-only">Archive</span>}
            </button>
          )}
          <button
            disabled={!valid}
            onClick={() => void save()}
            className="bg-accent shadow-accent/30 flex-1 rounded-2xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-40"
          >
            {isNew ? 'Add account' : 'Save'}
          </button>
        </div>
        {confirmArchive && (
          <p className="-mt-2 text-center text-xs text-ink/50 dark:text-white/50">
            Archived accounts are hidden, but their past transactions stay in your history.
          </p>
        )}
      </div>
    </Sheet>
  )
}
