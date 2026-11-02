import { useEffect, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { GripVertical, Minus, Plus, RotateCcw } from 'lucide-react'
import { db } from '@/db/db.ts'
import { defaultDashboard } from '@/db/seed.ts'
import type { DashboardCard, DashboardCardId } from '@/domain/types.ts'
import { Sheet } from '@/ui/Sheet.tsx'
import { dashboardCards } from './cards.tsx'

interface Props {
  open: boolean
  layout: DashboardCard[]
  onClose: () => void
}

const save = (dashboard: DashboardCard[]) => db.settings.update('app', { dashboard })

const allIds = defaultDashboard.map((c) => c.id)

/** Split a saved layout into shown (in order) and hidden card ids. */
function split(layout: DashboardCard[]) {
  const known = layout.filter((c) => dashboardCards[c.id])
  const shown = known.filter((c) => !c.hidden).map((c) => c.id)
  // Cards added in newer versions that this layout doesn't list yet start hidden.
  const hidden = allIds.filter((id) => !shown.includes(id))
  return { shown, hidden }
}

const toLayout = (shown: DashboardCardId[], hidden: DashboardCardId[]): DashboardCard[] => [
  ...shown.map((id) => ({ id })),
  ...hidden.map((id) => ({ id, hidden: true })),
]

/** Drag to reorder, tap − to hide, tap + to show. Changes save instantly. */
export function CustomizeSheet({ open, layout, onClose }: Props) {
  const [shown, setShown] = useState<DashboardCardId[]>([])
  const [hidden, setHidden] = useState<DashboardCardId[]>([])

  // Load the saved layout each time the sheet opens; while open, local state leads.
  useEffect(() => {
    if (!open) return
    const s = split(layout)
    setShown(s.shown)
    setHidden(s.hidden)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const commit = (nextShown: DashboardCardId[], nextHidden: DashboardCardId[]) => {
    setShown(nextShown)
    setHidden(nextHidden)
    void save(toLayout(nextShown, nextHidden))
  }

  const hide = (id: DashboardCardId) => commit(shown.filter((x) => x !== id), [...hidden, id])
  const show = (id: DashboardCardId) => commit([...shown, id], hidden.filter((x) => x !== id))

  return (
    <Sheet open={open} onClose={onClose} title="Customize Home">
      <p className="-mt-2 mb-4 text-sm text-ink/55 dark:text-white/55">
        Drag <GripVertical size={14} className="inline align-[-2px]" /> to reorder. Tap − to hide a card, + to bring it back.
      </p>

      <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">On your Home</h3>
      {shown.length === 0 ? (
        <p className="mb-4 rounded-2xl bg-ink/[0.03] p-4 text-center text-sm text-ink/50 dark:bg-white/[0.04] dark:text-white/50">
          Nothing shown. Add a card below.
        </p>
      ) : (
        <Reorder.Group axis="y" values={shown} onReorder={setShown} className="mb-5 space-y-2">
          {shown.map((id) => (
            <ShownRow key={id} id={id} onHide={() => hide(id)} onDrop={() => void save(toLayout(shown, hidden))} />
          ))}
        </Reorder.Group>
      )}

      {hidden.length > 0 && (
        <>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">Hidden</h3>
          <ul className="mb-2 space-y-2">
            {hidden.map((id) => (
              <li key={id}>
                <button
                  onClick={() => show(id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-ink/[0.03] p-3 text-left dark:bg-white/[0.04]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Plus size={18} strokeWidth={2.5} />
                  </span>
                  <CardText id={id} muted />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        onClick={() => {
          const s = split(defaultDashboard)
          commit(s.shown, s.hidden)
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-ink/60 dark:text-white/60"
      >
        <RotateCcw size={16} /> Reset to default
      </button>
    </Sheet>
  )
}

function CardText({ id, muted }: { id: DashboardCardId; muted?: boolean }) {
  const def = dashboardCards[id]
  return (
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium ${muted ? 'text-ink/60 dark:text-white/60' : ''}`}>{def.title}</p>
      <p className="truncate text-xs text-ink/45 dark:text-white/45">{def.description}</p>
    </div>
  )
}

function ShownRow({ id, onHide, onDrop }: { id: DashboardCardId; onHide: () => void; onDrop: () => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px -10px rgb(0 0 0 / 0.35)' }}
      className="glass flex items-center gap-2 rounded-2xl p-2 pl-1"
    >
      <button
        aria-label={`Drag to move ${dashboardCards[id].title}`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-10 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-ink/35 active:cursor-grabbing dark:text-white/35"
      >
        <GripVertical size={20} />
      </button>
      <CardText id={id} />
      <button
        onClick={onHide}
        aria-label={`Hide ${dashboardCards[id].title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
    </Reorder.Item>
  )
}
