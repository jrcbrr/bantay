import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'

export const fieldClass = 'w-full rounded-xl bg-ink/[0.05] px-3 py-3 outline-none dark:bg-white/[0.07]'

export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">{children}</p>
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink/45 dark:text-white/45">{hint}</p>}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

/** Peso amount input. Value is the raw text; parse with `parseAmount`. */
export function AmountInput({
  value,
  onChange,
  autoFocus,
  placeholder = '0',
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  placeholder?: string
}) {
  return (
    <div className={`${fieldClass} flex items-baseline gap-1`}>
      <span className="text-ink/40 dark:text-white/40">₱</span>
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="tabular w-full bg-transparent font-medium outline-none"
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  return (
    <div
      className="grid gap-1 rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-lg py-2 text-xs font-medium transition ${
            value === v ? 'bg-white text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/55 dark:text-white/55'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Chips({
  items,
  value,
  onChange,
}: {
  items: readonly (readonly [id: string, label: string, icon?: ReactNode])[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([id, label, icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 rounded-full py-1.5 text-sm transition ${icon ? 'pr-3 pl-1.5' : 'px-3'} ${
            value === id
              ? 'bg-ink text-white dark:bg-white dark:text-ink'
              : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ colors, value, onChange }: { colors: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className="flex aspect-square items-center justify-center rounded-full"
          style={{ background: c, boxShadow: value === c ? `0 0 0 3px ${c}55` : undefined }}
        >
          {value === c && <Check size={16} className="text-white" />}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink/50 dark:text-white/50">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-ink/15 dark:bg-white/15'}`}>
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </button>
  )
}

export function PrimaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`bg-accent shadow-accent/30 flex-1 rounded-2xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-40 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  )
}

/** Two-tap destructive button: first tap arms it, second tap runs `onConfirm`. */
export function DangerButton({
  armed,
  onClick,
  icon,
  armedLabel,
  srLabel,
}: {
  armed: boolean
  onClick: () => void
  icon: ReactNode
  armedLabel: string
  srLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
        armed ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400'
      }`}
    >
      {icon}
      {armed ? armedLabel : <span className="sr-only">{srLabel}</span>}
    </button>
  )
}

export function ProgressBar({ ratio, tone }: { ratio: number; tone: 'ok' | 'warning' | 'over' | 'accent' }) {
  const color =
    tone === 'over' ? 'bg-red-500' : tone === 'warning' ? 'bg-amber-500' : tone === 'ok' ? 'bg-emerald-500' : 'bg-accent'
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07] dark:bg-white/[0.08]">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
    </div>
  )
}
