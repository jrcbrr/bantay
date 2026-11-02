import { useMemo, useState } from 'react'
import { CalendarDays, List, Search, X } from 'lucide-react'
import { useLookups, useTransactions } from '@/db/hooks.ts'
import { monthKey } from '@/domain/calendar.ts'
import { fromISODate, toISODate, today } from '@/domain/dates.ts'
import { filterTransactions, type NameLookup } from '@/domain/filters.ts'
import type { Transaction, TransactionType } from '@/domain/types.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { CalendarView } from './CalendarView.tsx'
import { TransactionGroups } from './TransactionGroups.tsx'

type View = 'list' | 'calendar'

const typeFilters: [TransactionType | 'all', string][] = [
  ['all', 'All'],
  ['expense', 'Spending'],
  ['income', 'Income'],
  ['transfer', 'Transfers'],
]

export function ActivityPage() {
  const transactions = useTransactions()
  const lookups = useLookups()

  const [view, setView] = useState<View>('list')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TransactionType | 'all'>('all')
  const [cursor, setCursor] = useState(() => {
    const t = today()
    return { year: t.getFullYear(), month: t.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(() => toISODate(today()))

  const names: NameLookup = useMemo(
    () => ({
      account: (id) => lookups.accounts.get(id)?.name,
      category: (id) => lookups.categories.get(id)?.name,
    }),
    [lookups],
  )

  const filtered = useMemo(
    () => filterTransactions(transactions, { query, type }, names),
    [transactions, query, type, names],
  )

  const month = monthKey(cursor.year, cursor.month)
  const inMonth = filtered.filter((t) => t.date.startsWith(month))
  const shown: Transaction[] =
    view === 'list' ? filtered : selected ? inMonth.filter((t) => t.date === selected) : inMonth

  const moveMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(null)
  }

  const isFiltering = !!query || type !== 'all'

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Everything you've logged"
        action={
          <div className="flex rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
            {(
              [
                ['list', List, 'List view'],
                ['calendar', CalendarDays, 'Calendar view'],
              ] as const
            ).map(([v, Icon, text]) => (
              <button
                key={v}
                aria-label={text}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-lg p-2 transition ${
                  view === v ? 'bg-white text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/50 dark:text-white/50'
                }`}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        }
      />

      <div className="glass mb-3 flex items-center gap-2 rounded-2xl px-3">
        <Search size={18} className="shrink-0 text-ink/40 dark:text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, categories, amounts…"
          className="w-full bg-transparent py-3 text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery('')} className="text-ink/40 dark:text-white/40">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {typeFilters.map(([v, text]) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              type === v
                ? 'bg-ink text-white dark:bg-white dark:text-ink'
                : 'bg-ink/[0.05] text-ink/60 dark:bg-white/[0.07] dark:text-white/60'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {view === 'calendar' && (
        <CalendarView
          year={cursor.year}
          month={cursor.month}
          transactions={inMonth}
          selected={selected}
          onSelect={(d) => setSelected(d === selected ? null : d)}
          onMove={moveMonth}
        />
      )}

      {view === 'calendar' && selected && (
        <h2 className="mt-5 mb-2 px-1 text-sm font-semibold">
          {new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(
            fromISODate(selected),
          )}
        </h2>
      )}

      {shown.length === 0 ? (
        <GlassCard className={view === 'calendar' ? 'mt-4' : ''}>
          <p className="py-6 text-center text-sm text-ink/50 dark:text-white/50">
            {isFiltering
              ? 'Nothing matches your search.'
              : view === 'calendar' && selected
                ? 'Nothing logged this day.'
                : 'No transactions yet.'}
          </p>
        </GlassCard>
      ) : (
        <div className={view === 'calendar' && !selected ? 'mt-4' : ''}>
          <TransactionGroups transactions={shown} lookups={lookups} />
        </div>
      )}
    </>
  )
}
