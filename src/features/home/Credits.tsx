import { Instagram, Mail } from 'lucide-react'

const link = 'flex items-center gap-1 transition hover:text-accent dark:hover:text-accent-soft'

/** Creator credit shown at the top of Home. */
export function Credits() {
  return (
    <div className="glass flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl px-4 py-2 text-xs text-ink/60 dark:text-white/60">
      <span>
        Made by <b className="font-semibold text-ink dark:text-white">John Rudolph Cabrera</b>
      </span>
      <a href="mailto:johnrudolph2010@gmail.com" className={link}>
        <Mail size={13} /> johnrudolph2010@gmail.com
      </a>
      <a href="https://instagram.com/jrcbrr_" target="_blank" rel="noopener noreferrer" className={link}>
        <Instagram size={13} /> @jrcbrr_
      </a>
    </div>
  )
}
