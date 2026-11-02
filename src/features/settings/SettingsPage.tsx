import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Tags, Zap } from 'lucide-react'
import { BackupCard } from './BackupCard.tsx'
import { PinCard } from './PinCard.tsx'
import { RoundUpCard } from './RoundUpCard.tsx'
import { db } from '@/db/db.ts'
import { useSettings } from '@/db/hooks.ts'
import type { AllowanceCycle, Settings } from '@/domain/types.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { PageHeader } from '@/ui/PageHeader.tsx'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const update = (patch: Partial<Settings>) => db.settings.update('app', patch)

export function SettingsPage() {
  const s = useSettings()
  if (!s) return null

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <GlassCard className="space-y-4">
          <h2 className="font-semibold">Baon</h2>
          <Field label="I get baon">
            <Segmented
              value={s.allowanceCycle}
              options={[
                ['days', 'On set days'],
                ['weekly', 'Weekly'],
                ['monthly', 'Monthly'],
              ]}
              onChange={(v) => update({ allowanceCycle: v as AllowanceCycle })}
            />
          </Field>
          {(s.allowanceCycle === 'days' || s.allowanceCycle === 'daily') && (
            <div>
              <div className="flex justify-between gap-1.5">
                {weekdays.map((d, i) => {
                  const days = s.allowanceDays ?? []
                  const on = days.includes(i)
                  return (
                    <button
                      key={d}
                      aria-pressed={on}
                      aria-label={d}
                      onClick={() =>
                        update({
                          allowanceCycle: 'days',
                          allowanceDays: on ? days.filter((x) => x !== i) : [...days, i].sort(),
                        })
                      }
                      className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition ${
                        on
                          ? 'bg-accent shadow-accent/30 text-white shadow-md'
                          : 'bg-ink/[0.05] text-ink/50 dark:bg-white/[0.07] dark:text-white/50'
                      }`}
                    >
                      {d.slice(0, 1)}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-ink/50 dark:text-white/50">
                Safe to spend stretches each baon until the next baon day — Friday's covers the weekend.
              </p>
            </div>
          )}
          {s.allowanceCycle === 'weekly' && (
            <Field label="Every">
              <select
                className="glass rounded-xl px-3 py-2 text-sm"
                value={s.allowanceWeekday}
                onChange={(e) => update({ allowanceWeekday: Number(e.target.value) })}
              >
                {weekdays.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {s.allowanceCycle === 'monthly' && (
            <Field label="On day">
              <input
                type="number"
                min={1}
                max={28}
                className="glass w-20 rounded-xl px-3 py-2 text-sm"
                value={s.allowanceDayOfMonth}
                onChange={(e) => update({ allowanceDayOfMonth: Math.min(28, Math.max(1, Number(e.target.value))) })}
              />
            </Field>
          )}
        </GlassCard>

        <GlassCard className="p-2!">
          <Link to="/settings/categories" className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <Tags size={20} className="text-accent dark:text-accent-soft" />
            <span className="flex-1 font-medium">Categories</span>
            <span className="text-sm text-ink/50 dark:text-white/50">Add, rename, reorder</span>
            <ChevronRight size={18} className="text-ink/30 dark:text-white/30" />
          </Link>
          <Link to="/settings/templates" className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <Zap size={20} className="text-accent dark:text-accent-soft" />
            <span className="flex-1 font-medium">Quick templates</span>
            <span className="text-sm text-ink/50 dark:text-white/50">Baon, fare, lunch…</span>
            <ChevronRight size={18} className="text-ink/30 dark:text-white/30" />
          </Link>
        </GlassCard>

        <RoundUpCard />
        <BackupCard />
        <PinCard />

        <GlassCard>
          <Field label="Appearance">
            <Segmented
              value={s.theme}
              options={[
                ['system', 'System'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ]}
              onChange={(v) => update({ theme: v as Settings['theme'] })}
            />
          </Field>
        </GlassCard>

        <p className="text-center text-xs text-ink/40 dark:text-white/40">
          Bantay works offline. Your data stays on this device and is never uploaded anywhere.
        </p>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink/70 dark:text-white/70">{label}</span>
      {children}
    </div>
  )
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            value === v ? 'bg-white text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/55 dark:text-white/55'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
