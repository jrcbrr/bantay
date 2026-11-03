import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2 pb-5">
      <div>
        {subtitle && <p className="text-sm text-ink/50 dark:text-white/50">{subtitle}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      {action}
    </header>
  )
}
