import { AtSign, Instagram, Mail } from 'lucide-react'
import { GlassCard } from '@/ui/GlassCard.tsx'

const AUTHOR = {
  name: 'John Rudolph',
  email: 'johnrudolph2010@gmail.com',
  instagram: 'jrcbrr_',
}

const row =
  'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]'

export function AboutCard() {
  return (
    <GlassCard className="p-2!">
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <h2 className="font-semibold">Bantay</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">Made by {AUTHOR.name}</p>
        </div>
      </div>
      <a href={`mailto:${AUTHOR.email}`} className={row}>
        <Mail size={18} className="text-accent dark:text-accent-soft" />
        <span className="flex-1 truncate">{AUTHOR.email}</span>
      </a>
      <a href={`https://instagram.com/${AUTHOR.instagram}`} target="_blank" rel="noopener noreferrer" className={row}>
        <Instagram size={18} className="text-accent dark:text-accent-soft" />
        <span className="flex flex-1 items-center gap-0.5 truncate">
          <AtSign size={13} className="text-ink/40 dark:text-white/40" />
          {AUTHOR.instagram}
        </span>
      </a>
    </GlassCard>
  )
}
