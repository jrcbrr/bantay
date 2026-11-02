import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pt-2 pb-5">
      <div>
        {subtitle && <p className="text-sm text-ink/50 dark:text-white/50">{subtitle}</p>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
