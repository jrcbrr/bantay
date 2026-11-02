import { useRef, useState } from 'react'
import { usePrivacy } from '@/app/privacy.ts'
import { fromISODate } from '@/domain/dates.ts'
import type { ForecastPoint } from '@/domain/forecast.ts'
import { formatPHP } from '@/domain/money.ts'

const W = 320
const H = 120
const PAD = { top: 10, right: 6, bottom: 18, left: 6 }
const dayFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })

/** Single-series projected balance line with a crosshair tooltip. */
export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const hidden = usePrivacy((s) => s.hidden)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) return null

  const values = points.map((p) => p.balance)
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`
  const zeroY = y(0)
  const active = hover !== null ? points[hover] : undefined

  const onMove = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const rel = ((clientX - rect.left) / rect.width) * W
    const i = Math.round(((rel - PAD.left) / (W - PAD.left - PAD.right)) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-32 w-full touch-none overflow-visible select-none"
        role="img"
        aria-label={`Projected balance over the next ${points.length - 1} days`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="forecast-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2f6bff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Zero line: below it you'd be out of money */}
        {min < 0 && (
          <>
            <rect x={PAD.left} y={zeroY} width={W - PAD.left - PAD.right} height={Math.max(0, y(min) - zeroY)} className="fill-red-500/10" />
            <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} strokeDasharray="3 3" className="stroke-red-500/60" strokeWidth={1} />
          </>
        )}

        <path d={area} fill="url(#forecast-fill)" />
        <path d={line} fill="none" stroke="#2f6bff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {ticks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 3}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="fill-ink/45 text-[9px] dark:fill-white/45"
          >
            {i === 0 ? 'Today' : dayFmt.format(fromISODate(points[i]!.date))}
          </text>
        ))}

        {active && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-ink/25 dark:stroke-white/30" strokeWidth={1} />
            <circle
              cx={x(hover)}
              cy={y(active.balance)}
              r={4}
              fill="#2f6bff"
              className="stroke-paper dark:stroke-ink"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {active && hover !== null && (
        <div
          className="glass pointer-events-none absolute top-0 rounded-xl px-2.5 py-1.5 text-xs whitespace-nowrap"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})`,
          }}
        >
          <p className="text-ink/55 dark:text-white/55">{hover === 0 ? 'Today' : dayFmt.format(fromISODate(active.date))}</p>
          <p className={`tabular font-semibold ${active.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {hidden ? '₱****' : formatPHP(active.balance)}
          </p>
        </div>
      )}
    </div>
  )
}
