import { useState } from 'react'
import { Link } from 'react-router'
import { BarChart3, Settings, SlidersHorizontal } from 'lucide-react'
import { useMoney } from '@/db/hooks.ts'
import { defaultDashboard } from '@/db/seed.ts'
import { PrivacyToggle } from '@/ui/PrivacyToggle.tsx'
import { Credits } from './Credits.tsx'
import { dashboardCards } from './cards.tsx'
import { CustomizeSheet } from './CustomizeSheet.tsx'

const dayFmt = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
const iconBtn = 'glass flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95'

export function HomePage() {
  const money = useMoney()
  const [customizing, setCustomizing] = useState(false)
  const layout = money.settings?.dashboard ?? defaultDashboard
  const visible = layout.filter((c) => !c.hidden && dashboardCards[c.id])

  return (
    <div className="space-y-4">
      <Credits />
      <header className="flex items-center justify-between gap-3 pt-2 pb-1">
        <div className="min-w-0">
          <p className="text-sm text-ink/50 dark:text-white/50">{dayFmt.format(new Date())}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Bantay</h1>
        </div>
        <div className="flex gap-2">
          <PrivacyToggle />
          <Link to="/insights" aria-label="Insights" className={`${iconBtn} md:hidden`}>
            <BarChart3 size={18} />
          </Link>
          <button aria-label="Customize dashboard" onClick={() => setCustomizing(true)} className={iconBtn}>
            <SlidersHorizontal size={18} />
          </button>
          <Link to="/settings" aria-label="Settings" className={`${iconBtn} md:hidden`}>
            <Settings size={18} />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((c) => (
          <div key={c.id} className={c.id === 'balance' || c.id === 'forecast' || c.id === 'recent' ? 'lg:col-span-2' : ''}>
            {dashboardCards[c.id].render({ money })}
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <button onClick={() => setCustomizing(true)} className="glass w-full rounded-3xl p-6 text-sm text-ink/55 dark:text-white/55">
          All cards are hidden. Tap to choose what to show.
        </button>
      )}

      <CustomizeSheet open={customizing} layout={layout} onClose={() => setCustomizing(false)} />
    </div>
  )
}
