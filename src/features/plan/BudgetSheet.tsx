import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { useBudgets, useCategories } from '@/db/hooks.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Budget, BudgetPeriod } from '@/domain/types.ts'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { AmountInput, Chips, DangerButton, Field, PrimaryButton, Segmented } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

export type BudgetTarget = Budget | 'new' | null

export function BudgetSheet({ target, onClose }: { target: BudgetTarget; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const categories = useCategories().filter((c) => c.kind === 'expense')
  const budgets = useBudgets()

  const [categoryId, setCategoryId] = useState('')
  const [limitText, setLimitText] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>('weekly')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setCategoryId(existing?.categoryId ?? '')
    setLimitText(existing ? String(existing.limit / 100) : '')
    setPeriod(existing?.period ?? 'weekly')
  }, [target, existing])

  // One budget per category.
  const taken = new Set(budgets.filter((b) => b.id !== existing?.id).map((b) => b.categoryId))
  const choices = categories.filter((c) => !taken.has(c.id))
  const limit = parseAmount(limitText)
  const valid = !!categoryId && limit !== null

  const save = async () => {
    if (!valid || limit === null) return
    if (existing) await db.budgets.update(existing.id, { categoryId, limit, period })
    else await db.budgets.add({ id: newId(), categoryId, limit, period })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.budgets.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit budget' : 'New budget'}>
      <div className="space-y-5">
        <Field label="Limit">
          <AmountInput value={limitText} onChange={setLimitText} autoFocus={!existing} />
        </Field>
        <Field label="Every">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              ['weekly', 'Week (Mon–Sun)'],
              ['monthly', 'Month'],
            ]}
          />
        </Field>
        <Field label="Category">
          {choices.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-white/50">Every spending category already has a budget.</p>
          ) : (
            <Chips
              items={choices.map((c) => [c.id, c.name, <CategoryIcon key={c.id} category={c} />] as const)}
              value={categoryId}
              onChange={setCategoryId}
            />
          )}
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete budget" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add budget'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
