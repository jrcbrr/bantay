import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import { db, newId } from '@/db/db.ts'
import { useCategories, useLookups, useRules, useSettings } from '@/db/hooks.ts'
import { normalizeKeyword, type CategoryRule } from '@/domain/rules.ts'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { Chips, DangerButton, Field, PrimaryButton, TextInput, Toggle } from '@/ui/form.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

type Target = CategoryRule | 'new' | null

export function RulesPage() {
  const rules = useRules()
  const lookups = useLookups()
  const settings = useSettings()
  const [target, setTarget] = useState<Target>(null)
  const [query, setQuery] = useState('')
  const shown = rules.filter((r) => r.keyword.includes(normalizeKeyword(query)))

  return (
    <>
      <Link to="/settings" className="text-accent dark:text-accent-soft -mb-1 flex items-center gap-1 pt-2 text-sm font-medium">
        <ChevronLeft size={16} /> Settings
      </Link>
      <PageHeader title="Auto-categorize" subtitle="Notes that pick a category for you" />

      <GlassCard className="mb-4">
        <Toggle
          checked={settings?.learnRules !== false}
          onChange={(on) => void db.settings.update('app', { learnRules: on })}
          label="Learn from my entries"
          hint="When you save a note with a category, Bantay remembers it for next time"
        />
      </GlassCard>

      <div className="glass mb-3 flex items-center gap-2 rounded-2xl px-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a word…"
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
      </div>

      <GlassCard className="p-2!">
        <ul>
          {shown.map((r) => {
            const cat = lookups.categories.get(r.categoryId)
            return (
              <li key={r.id}>
                <button
                  onClick={() => setTarget(r)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">“{r.keyword}”</span>
                  {r.learned && <Sparkles size={13} className="text-ink/35 dark:text-white/35" aria-label="Learned" />}
                  <span className="flex items-center gap-1.5 text-sm text-ink/60 dark:text-white/60">
                    {cat && <CategoryIcon category={cat} />}
                    {cat?.name ?? 'Category'}
                  </span>
                </button>
              </li>
            )
          })}
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink/50 dark:text-white/50">No rules match.</li>}
        </ul>
        <button
          onClick={() => setTarget('new')}
          className="text-accent dark:text-accent-soft flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium"
        >
          <Plus size={18} /> Add rule
        </button>
      </GlassCard>
      <p className="mt-3 px-1 text-xs text-ink/50 dark:text-white/50">
        Type a note in the + sheet and the matching category gets picked. You can still change it before saving. ✨ = learned
        from your entries.
      </p>

      <RuleSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}

function RuleSheet({ target, onClose }: { target: Target; onClose: () => void }) {
  const existing = target && target !== 'new' ? target : null
  const categories = useCategories()
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!target) return
    setArmed(false)
    setKeyword(existing?.keyword ?? '')
    setCategoryId(existing?.categoryId ?? '')
  }, [target, existing])

  const k = normalizeKeyword(keyword)
  const valid = k.length >= 2 && !!categoryId

  const save = async () => {
    if (!valid) return
    if (existing) await db.rules.update(existing.id, { keyword: k, categoryId, learned: false })
    else await db.rules.add({ id: newId(), keyword: k, categoryId, createdAt: Date.now() })
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    if (!armed) return setArmed(true)
    await db.rules.delete(existing.id)
    onClose()
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={existing ? 'Edit rule' : 'New rule'}>
      <div className="space-y-5">
        <Field label="When the note has" hint="A word or short phrase, e.g. jollibee, milk tea, angkas">
          <TextInput value={keyword} onChange={(e) => setKeyword(e.target.value)} autoFocus={!existing} />
        </Field>
        <Field label="Use category">
          <Chips
            items={categories.map((c) => [c.id, c.name, <CategoryIcon key={c.id} category={c} />] as const)}
            value={categoryId}
            onChange={setCategoryId}
          />
        </Field>
        <div className="flex gap-2">
          {existing && (
            <DangerButton armed={armed} onClick={() => void remove()} icon={<Trash2 size={18} />} armedLabel="Tap to delete" srLabel="Delete rule" />
          )}
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            {existing ? 'Save' : 'Add rule'}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  )
}
