import { useEffect } from 'react'
import { useSettings } from '@/db/hooks.ts'

/** Applies the `dark` class to <html> from settings, following the OS when set to "system". */
export function useTheme() {
  const theme = useSettings()?.theme ?? 'system'

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
