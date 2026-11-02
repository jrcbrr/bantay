import { useState } from 'react'
import { usePrivacy } from '@/app/privacy.ts'
import { formatPHP } from '@/domain/money.ts'

export interface BarSeries {
  name: string
  color: string
}

export interface BarGroup {
  label: string
  /** Optional longer label for the tooltip. */
  title?: string
  values: number[]
}

/** Validated income/spending pair (passes CVD and contrast checks in light and dark). */
export const INCOME_COLOR = '#0d9488'
export const SPEND_COLOR = '#e11d48'

const H = 140
const AXIS = 18

/**
 * Grouped vertical bars, 1–2 series. Thin bars with rounded tops, a 2px gap inside groups,
 * a legend for 2 series, and a tap/hover tooltip per group.
 */
export function BarChart({ groups, series }: { groups: BarGroup[]; series: BarSeries[] }) {
  const hidden = usePrivacy((s) => s.hidden)
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...groups.flatMap((g) => g.values))
  const plot = H - AXIS
  const act = active !== null ? groups[active] : undefined

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex gap-4 text-xs text-ink/60 dark:text-white/60">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="relative" onPointerLeave={() => setActive(null)}>
        <div className="flex items-end gap-1" style={{ height: H }}>
          {groups.map((g, i) => (
            <button
              key={i}
              type="button"
              onPointerEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              aria-label={`${g.title ?? g.label}: ${series.map((s, k) => `${s.name} ${hidden ? 'hidden' : formatPHP(g.values[k] ?? 0)}`).join(', ')}`}
              className={`flex h-full min-w-0 flex-1 flex-col justify-end rounded-lg transition ${active === i ? 'bg-ink/[0.04] dark:bg-white/[0.05]' : ''}`}
            >
              <div className="flex items-end justify-center gap-0.5" style={{ height: plot }}>
                {g.values.map((v, k) => (
                  <div
                    key={k}
                    className="w-full max-w-4 rounded-t transition-all"
                    style={{
                      height: v > 0 ? Math.max(2, (v / max) * (plot - 4)) : 0,
                      background: series[k]?.color,
                      opacity: active === null || active === i ? 1 : 0.45,
                    }}
                  />
                ))}
              </div>
              <span className="mt-1 block truncate text-center text-[10px] text-ink/45 dark:text-white/45" style={{ height: AXIS - 4 }}>
                {g.label}
              </span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 border-t border-ink/10 dark:border-white/10" style={{ top: plot }} />
        {act && active !== null && (
          <div
            className="glass pointer-events-none absolute top-0 z-10 rounded-xl px-2.5 py-1.5 text-xs whitespace-nowrap"
            style={{
              left: `${((active + 0.5) / groups.length) * 100}%`,
              transform: `translateX(${active > groups.length / 2 ? '-100%' : '0'})`,
            }}
          >
            <p className="mb-0.5 text-ink/55 dark:text-white/55">{act.title ?? act.label}</p>
            {series.map((s, k) => (
              <p key={s.name} className="tabular flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                {series.length > 1 && <span className="text-ink/55 dark:text-white/55">{s.name}</span>}
                {hidden ? '₱****' : formatPHP(act.values[k] ?? 0)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
