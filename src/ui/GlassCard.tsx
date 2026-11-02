import type { HTMLAttributes } from 'react'

export function GlassCard({ className = '', children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`glass rounded-3xl p-5 ${className}`} {...rest}>
      {children}
    </section>
  )
}
