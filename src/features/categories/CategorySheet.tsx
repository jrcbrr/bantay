import { useEffect, useState } from 'react'
import { Check, EyeOff } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import type { Category, CategoryKind } from '@/domain/types.ts'
import { categoryColors, categoryIcons } from '@/ui/CategoryIcon.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type CategorySheetTarget = Category | { new: CategoryKind } | null

interface Props {
  target: CategorySheetTarget
  /** Next free sort position for new categories. */
  nextOrder: number
  onClose: () => void
}

const label = 'mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45'

export function CategorySheet({ target, nextOrder, onClose }: Props) {
  const existing = target && 'id' in target ? target : null
  const kind: CategoryKind = existing ? existing.kind : target && 'new' in target ? target.new : 'expense'

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('circle-ellipsis')
  const [color, setColor] = useState(categoryColors[0]!)

  useEffect(() => {
    if (!target) return
    if ('id' in target) {
      setName(target.name)
      setIcon(target.icon)
      setColor(target.color)
    } else {
      setName('')
      setIcon('circle-ellipsis')
      setColor(categoryColors[0]!)
    }
  }, [target])

  const save = async () => {
    if (!name.trim()) return
    if (existing) await db.categories.update(existing.id, { name: name.trim(), icon, color })
    else await db.categories.add({ id: newId(), name: name.trim(), kind, icon, color, order: nextOrder })
    onClose()
  }

  const hide = async () => {
    if (!existing) return
    await db.categories.update(existing.id, { archived: true })
    onClose()
  }

  const PreviewIcon = categoryIcons[icon]

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={existing ? 'Edit category' : kind === 'income' ? 'New income category' : 'New spending category'}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `${color}22`, color }}
          >
            {PreviewIcon && <PreviewIcon size={26} />}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            autoFocus={!existing}
            className="flex-1 rounded-xl bg-ink/[0.05] px-3 py-3 font-medium outline-none dark:bg-white/[0.07]"
          />
        </div>

        <div>
          <p className={label}>Icon</p>
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(categoryIcons).map(([key, Icon]) => (
              <button
                key={key}
                aria-label={key}
                onClick={() => setIcon(key)}
                className={`flex aspect-square items-center justify-center rounded-xl transition ${
                  icon === key ? 'bg-accent text-white' : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
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
            {categoryColors.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className="flex aspect-square items-center justify-center rounded-full"
                style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}55` : undefined }}
              >
                {color === c && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {existing && (
            <button
              onClick={() => void hide()}
              className="flex items-center gap-2 rounded-2xl bg-ink/[0.05] px-4 py-3.5 text-sm font-semibold text-ink/70 dark:bg-white/[0.07] dark:text-white/70"
            >
              <EyeOff size={18} /> Hide
            </button>
          )}
          <button
            disabled={!name.trim()}
            onClick={() => void save()}
            className="bg-accent shadow-accent/30 flex-1 rounded-2xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-40"
          >
            {existing ? 'Save' : 'Add category'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
