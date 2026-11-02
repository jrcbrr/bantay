import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { db } from '@/db/db.ts'
import { defaultDashboard } from '@/db/seed.ts'
import type { DashboardCard } from '@/domain/types.ts'
import { Sheet } from '@/ui/Sheet.tsx'
import { dashboardCards } from './cards.tsx'

interface Props {
  open: boolean
  layout: DashboardCard[]
  onClose: () => void
}

const save = (dashboard: DashboardCard[]) => db.settings.update('app', { dashboard })

/** Show/hide and reorder Home cards. Changes apply instantly. */
export function CustomizeSheet({ open, layout, onClose }: Props) {
  // Include any cards added in later versions that this layout doesn't know about yet.
  const known = new Set(layout.map((c) => c.id))
  const full = [...layout.filter((c) => dashboardCards[c.id]), ...defaultDashboard.filter((c) => !known.has(c.id)).map((c) => ({ ...c, hidden: true }))]

  const move = (i: number, delta: number) => {
    const next = [...full]
    const j = i + delta
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    void save(next)
  }

  const toggle = (i: number) => void save(full.map((c, k) => (k === i ? { ...c, hidden: !c.hidden } : c)))

  return (
    <Sheet open={open} onClose={onClose} title="Customize Home">
      <ul className="space-y-1">
        {full.map((c, i) => {
          const def = dashboardCards[c.id]
          return (
            <li key={c.id} className={`flex items-center gap-2 rounded-2xl px-2 py-2 ${c.hidden ? 'opacity-50' : ''}`}>
              <button
                onClick={() => toggle(i)}
                aria-pressed={!c.hidden}
                aria-label={c.hidden ? `Show ${def.title}` : `Hide ${def.title}`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  c.hidden ? 'bg-ink/[0.05] dark:bg-white/[0.07]' : 'bg-accent/12 text-accent dark:text-accent-soft'
                }`}
              >
                {c.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{def.title}</p>
                <p className="truncate text-xs text-ink/50 dark:text-white/50">{def.description}</p>
              </div>
              <button
                aria-label={`Move ${def.title} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded-lg p-2 text-ink/40 disabled:opacity-20 dark:text-white/40"
              >
                <ChevronUp size={18} />
              </button>
              <button
                aria-label={`Move ${def.title} down`}
                disabled={i === full.length - 1}
                onClick={() => move(i, 1)}
                className="rounded-lg p-2 text-ink/40 disabled:opacity-20 dark:text-white/40"
              >
                <ChevronDown size={18} />
              </button>
            </li>
          )
        })}
      </ul>
      <button
        onClick={() => void save(defaultDashboard)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-ink/60 dark:text-white/60"
      >
        <RotateCcw size={16} /> Reset to default
      </button>
    </Sheet>
  )
}
