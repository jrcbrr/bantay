import { formatPHP } from '@/domain/money.ts'
import type { Centavos } from '@/domain/types.ts'

interface Props {
  value: Centavos
  sign?: boolean
  compact?: boolean
  className?: string
  /** Color income blue and spending muted. */
  tone?: 'auto' | 'none'
}

export function Amount({ value, sign, compact, className = '', tone = 'none' }: Props) {
  const color =
    tone === 'auto'
      ? value > 0
        ? 'text-accent dark:text-accent-soft'
        : value < 0
          ? 'text-ink/60 dark:text-white/60'
          : ''
      : ''
  return <span className={`tabular ${color} ${className}`}>{formatPHP(value, { sign, compact })}</span>
}
