import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, Trash2 } from 'lucide-react'
import { db } from '@/db/db.ts'
import type { Account } from '@/domain/types.ts'
import { AccountIcon, accountColors, accountIcons, imageFileToIcon } from '@/ui/AccountIcon.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

interface Props {
  account: Account | null
  onClose: () => void
}

export function AccountSheet({ account, onClose }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | undefined>()
  const [color, setColor] = useState<string | undefined>()
  const [iconImage, setIconImage] = useState<string | undefined>()
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!account) return
    setName(account.name)
    setIcon(account.icon)
    setColor(account.color)
    setIconImage(account.iconImage)
    setError('')
  }, [account])

  const preview = account ? { ...account, name, icon, color, iconImage } : null

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
    if (!account || !name.trim()) return
    await db.accounts.update(account.id, { name: name.trim(), icon, color, iconImage })
    onClose()
  }

  return (
    <Sheet open={!!account} onClose={onClose} title="Edit account">
      {preview && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <AccountIcon account={preview} size={64} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account name"
              className="flex-1 rounded-xl bg-ink/[0.05] px-3 py-3 font-medium outline-none dark:bg-white/[0.07]"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">
              Your own image
            </p>
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
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">
                Icon
              </p>
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
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">
                Color
              </p>
              <div className="grid grid-cols-8 gap-2">
                {accountColors.map((c) => (
                  <button
                    key={c}
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className="flex aspect-square items-center justify-center rounded-full ring-offset-2 ring-offset-transparent transition"
                    style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}55` : undefined }}
                  >
                    {color === c && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <button
            disabled={!name.trim()}
            onClick={() => void save()}
            className="bg-accent shadow-accent/30 w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}
    </Sheet>
  )
}
