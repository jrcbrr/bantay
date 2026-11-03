import { NavLink, Outlet } from 'react-router'
import { ArrowLeftRight, BarChart3, Gem, Home, Plus, Settings, Target, type LucideIcon } from 'lucide-react'
import { Backdrop } from '@/ui/Backdrop.tsx'
import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet.tsx'
import { useEffect } from 'react'
import { useSettings } from '@/db/hooks.ts'
import { GoalCelebration } from './GoalCelebration.tsx'
import { Toaster } from './Toaster.tsx'
import { LockScreen } from './LockScreen.tsx'
import { useLock, watchVisibility } from './pin.ts'
import { useSheets } from './sheets.ts'
import { useTheme } from './useTheme.ts'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/activity', label: 'Activity', icon: ArrowLeftRight },
  { to: '/plan', label: 'Plan', icon: Target },
  { to: '/wealth', label: 'Wealth', icon: Gem },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent text-white shadow-lg shadow-accent/30'
      : 'text-ink/60 hover:bg-ink/5 dark:text-white/60 dark:hover:bg-white/5'
  }`

export function Shell() {
  useTheme()
  const openAdd = useSheets((s) => s.openAdd)
  const settings = useSettings()
  const locked = useLock((s) => s.locked)
  const unlock = useLock((s) => s.unlock)
  const hasPin = !!settings?.pinHash

  // No PIN set: never locked. With a PIN: lock again after a minute in the background.
  useEffect(() => {
    if (settings && !settings.pinHash) unlock()
  }, [settings, unlock])
  useEffect(() => watchVisibility(), [])

  // Don't flash your balances before we know whether a PIN is set.
  if (!settings) return <Backdrop />
  if (hasPin && locked) return <LockScreen />

  return (
    <div className="relative min-h-dvh">
      <Backdrop />

      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-4 left-4 hidden w-60 flex-col rounded-3xl p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-1">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-8 w-8 rounded-xl" />
          <span className="text-lg font-semibold tracking-tight">Bantay</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              <Icon size={18} strokeWidth={2} /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => openAdd()}
          className="bg-accent mb-2 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition active:scale-[0.98]"
        >
          <Plus size={18} /> Add transaction
        </button>
        <NavLink to="/insights" className={linkClass}>
          <BarChart3 size={18} /> Insights
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} /> Settings
        </NavLink>
      </aside>

      <main className="mx-auto max-w-2xl px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32 md:ml-72 md:max-w-3xl md:pt-8 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile floating tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 sm:px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="glass mx-auto flex max-w-md items-center justify-between rounded-[2rem] px-2 py-2">
          {tabs.slice(0, 2).map((t) => (
            <TabLink key={t.to} {...t} />
          ))}
          <button
            onClick={() => openAdd()}
            aria-label="Add transaction"
            className="bg-accent -my-6 mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-xl shadow-accent/40 transition active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
          {tabs.slice(2).map((t) => (
            <TabLink key={t.to} {...t} />
          ))}
        </div>
      </nav>

      <QuickAddSheet />
      <GoalCelebration />
      <Toaster />
    </div>
  )
}

function TabLink({ to, label, icon: Icon }: Tab) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.7rem] font-medium transition-colors ${
          isActive ? 'text-accent dark:text-accent-soft' : 'text-ink/45 dark:text-white/45'
        }`
      }
    >
      <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={2} />
      {label}
    </NavLink>
  )
}
