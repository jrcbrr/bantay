import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'

export function BudgetPage() {
  return (
    <>
      <PageHeader title="Budget" subtitle="Limits, goals & subscriptions" />
      <GlassCard>
        <p className="py-6 text-center text-sm text-ink/50 dark:text-white/50">
          Category budgets, savings goals, recurring bills and subscriptions land in the Planning milestone.
        </p>
      </GlassCard>
    </>
  )
}
