import { useEffect } from 'react'
import { useSettings } from '@/db/hooks.ts'

/** Applies the `dark` class to <html> from settings, following the OS when set to "system". */
export const ACCENTS: [name: string, hex: string][] = [
  ['Bantay blue', '#2f6bff'],
  ['Indigo', '#4f46e5'],
  ['Violet', '#7c3aed'],
  ['Pink', '#db2777'],
  ['Red', '#dc2626'],
  ['Orange', '#ea580c'],
  ['Green', '#16a34a'],
  ['Teal', '#0d9488'],
  ['Graphite', '#3f3f46'],
]

export function useTheme() {
  const settings = useSettings()
  const theme = settings?.theme ?? 'system'
  const accent = settings?.accent

  // Accent color: everything themed uses the --color-accent variables.
  useEffect(() => {
    const root = document.documentElement.style
    if (accent) {
      root.setProperty('--color-accent', accent)
      root.setProperty('--color-accent-soft', `color-mix(in oklab, ${accent} 55%, white)`)
    } else {
      root.removeProperty('--color-accent')
      root.removeProperty('--color-accent-soft')
    }
  }, [accent])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
