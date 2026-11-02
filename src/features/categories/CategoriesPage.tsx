import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronLeft, ChevronUp, Eye, Plus } from 'lucide-react'
import { db } from '@/db/db.ts'
import type { Category, CategoryKind } from '@/domain/types.ts'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { CategorySheet, type CategorySheetTarget } from './CategorySheet.tsx'

const byOrder = (a: Category, b: Category) => (a.order ?? 999) - (b.order ?? 999)

/** Swap two categories' positions. */
async function swap(a: Category, b: Category) {
  const ao = a.order ?? 999
  const bo = b.order ?? 999
  await db.transaction('rw', db.categories, async () => {
    await db.categories.update(a.id, { order: bo === ao ? ao + 1 : bo })
    await db.categories.update(b.id, { order: ao })
  })
}

export function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [target, setTarget] = useState<CategorySheetTarget>(null)
  const all = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const active = all.filter((c) => c.kind === kind && !c.archived).sort(byOrder)
  const hidden = all.filter((c) => c.kind === kind && c.archived).sort(byOrder)
  const nextOrder = Math.max(0, ...all.map((c) => c.order ?? 0)) + 1

  return (
    <>
      <Link
        to="/settings"
        className="text-accent dark:text-accent-soft -mb-1 flex items-center gap-1 pt-2 text-sm font-medium"
      >
        <ChevronLeft size={16} /> Settings
      </Link>
      <PageHeader title="Categories" />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
        {(
          [
            ['expense', 'Spending'],
            ['income', 'Income'],
          ] as const
        ).map(([k, text]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              kind === k ? 'bg-white text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/55 dark:text-white/55'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <GlassCard className="p-2!">
        <ul>
          {active.map((c, i) => (
            <li key={c.id} className="flex items-center gap-1 rounded-2xl pr-1">
              <button
                onClick={() => setTarget(c)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${c.color}22` }}
                >
                  <CategoryIcon category={c} size={18} />
                </span>
                <span className="truncate text-sm font-medium">{c.name}</span>
              </button>
              <button
                aria-label={`Move ${c.name} up`}
                disabled={i === 0}
                onClick={() => void swap(c, active[i - 1]!)}
                className="rounded-lg p-2 text-ink/40 disabled:opacity-20 dark:text-white/40"
              >
                <ChevronUp size={18} />
              </button>
              <button
                aria-label={`Move ${c.name} down`}
                disabled={i === active.length - 1}
                onClick={() => void swap(c, active[i + 1]!)}
                className="rounded-lg p-2 text-ink/40 disabled:opacity-20 dark:text-white/40"
              >
                <ChevronDown size={18} />
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setTarget({ new: kind })}
          className="text-accent dark:text-accent-soft flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium"
        >
          <Plus size={18} /> Add {kind === 'income' ? 'income' : 'spending'} category
        </button>
      </GlassCard>

      {hidden.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">
            Hidden
          </h2>
          <GlassCard className="p-2!">
            <ul>
              {hidden.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <CategoryIcon category={c} size={18} />
                  <span className="flex-1 truncate text-sm text-ink/60 dark:text-white/60">{c.name}</span>
                  <button
                    onClick={() => void db.categories.update(c.id, { archived: false })}
                    className="text-accent dark:text-accent-soft flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
                  >
                    <Eye size={14} /> Show
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </>
      )}

      <CategorySheet target={target} nextOrder={nextOrder} onClose={() => setTarget(null)} />
    </>
  )
}
