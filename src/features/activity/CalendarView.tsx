import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dailyTotals, monthGrid, monthTotals, monthKey } from '@/domain/calendar.ts'
import { toISODate, today } from '@/domain/dates.ts'
import { formatPHP } from '@/domain/money.ts'
import type { ISODate, Transaction } from '@/domain/types.ts'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'

interface Props {
  year: number
  month: number
  /** Transactions in this month (already filtered). */
  transactions: Transaction[]
  selected: ISODate | null
  onSelect: (date: ISODate) => void
  onMove: (delta: number) => void
}

const monthFmt = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' })
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Short amount for tiny calendar cells: 189 → "189", 1250 → "1.3K". */
function cellAmount(c: number): string {
  const pesos = c / 100
  return pesos >= 1000 ? formatPHP(c, { compact: true }).replace('₱', '') : String(Math.round(pesos))
}

export function CalendarView({ year, month, transactions, selected, onSelect, onMove }: Props) {
  const weeks = monthGrid(year, month)
  const totals = dailyTotals(transactions)
  const sum = monthTotals(transactions, monthKey(year, month))
  const todayISO = toISODate(today())

  return (
    <GlassCard className="p-4!">
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => onMove(-1)} className="rounded-full p-2 hover:bg-ink/5 dark:hover:bg-white/10">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold">{monthFmt.format(new Date(year, month, 1))}</h2>
        <button aria-label="Next month" onClick={() => onMove(1)} className="rounded-full p-2 hover:bg-ink/5 dark:hover:bg-white/10">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-500/10 py-2">
          <p className="text-[11px] text-ink/50 dark:text-white/50">Income</p>
          <Amount value={sum.income} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="rounded-2xl bg-red-500/10 py-2">
          <p className="text-[11px] text-ink/50 dark:text-white/50">Spent</p>
          <Amount value={sum.expense} className="text-sm font-semibold text-red-600 dark:text-red-400" />
        </div>
        <div className="rounded-2xl bg-ink/[0.04] py-2 dark:bg-white/[0.06]">
          <p className="text-[11px] text-ink/50 dark:text-white/50">Net</p>
          <Amount value={sum.income - sum.expense} sign className="text-sm font-semibold" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-ink/40 dark:text-white/40">
            {d}
          </span>
        ))}
        {weeks.flat().map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />
          const t = totals.get(date)
          const isSelected = date === selected
          const isToday = date === todayISO
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-label={date}
              aria-pressed={isSelected}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                isSelected
                  ? 'bg-accent shadow-accent/30 text-white shadow-md'
                  : isToday
                    ? 'ring-accent/60 ring-2 ring-inset'
                    : 'hover:bg-ink/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <span className="font-medium">{Number(date.slice(8))}</span>
              {t && t.expense > 0 ? (
                <span
                  className={`tabular text-[10px] leading-tight ${isSelected ? 'text-white/85' : 'text-red-500 dark:text-red-400'}`}
                >
                  {cellAmount(t.expense)}
                </span>
              ) : t && t.income > 0 ? (
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
              ) : (
                <span className="h-[14px]" />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-ink/40 dark:text-white/40">
        Red = spent that day · green dot = money in · tap a day to see it
      </p>
    </GlassCard>
  )
}
