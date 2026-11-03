import { usePrivacy } from '@/app/privacy.ts'
import { formatPHP } from '@/domain/money.ts'
import type { Centavos } from '@/domain/types.ts'

interface Props {
  value: Centavos
  sign?: boolean
  compact?: boolean
  className?: string
  /** Color income green and spending red. */
  tone?: 'auto' | 'none'
}

export function Amount({ value, sign, compact, className = '', tone = 'none' }: Props) {
  const hidden = usePrivacy((s) => s.hidden)
  const color =
    tone === 'auto' && !hidden
      ? value > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : value < 0
          ? 'text-red-600 dark:text-red-400'
          : ''
      : ''
  return (
    <span className={`tabular [overflow-wrap:break-word] ${color} ${className}`} aria-label={hidden ? 'Amount hidden' : undefined}>
      {hidden ? '₱****' : formatPHP(value, { sign, compact })}
    </span>
  )
}
