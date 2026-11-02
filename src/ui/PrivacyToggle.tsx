import { Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '@/app/privacy.ts'

export function PrivacyToggle({ className = '' }: { className?: string }) {
  const { hidden, toggle } = usePrivacy()
  return (
    <button
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
      title={hidden ? 'Show amounts' : 'Hide amounts'}
      className={`glass flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${className}`}
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} className="text-accent dark:text-accent-soft" />}
    </button>
  )
}
