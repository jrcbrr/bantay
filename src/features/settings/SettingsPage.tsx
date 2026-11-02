import type { ReactNode } from 'react'
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
                ['daily', 'Daily'],
                ['weekly', 'Weekly'],
                ['monthly', 'Monthly'],
              ]}
              onChange={(v) => update({ allowanceCycle: v as AllowanceCycle })}
            />
          </Field>
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
          All data stays on this device. Backup & PIN lock coming soon.
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
