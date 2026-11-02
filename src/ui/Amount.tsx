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
  const color =
    tone === 'auto'
      ? value > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : value < 0
          ? 'text-red-600 dark:text-red-400'
          : ''
      : ''
  return <span className={`tabular ${color} ${className}`}>{formatPHP(value, { sign, compact })}</span>
}
