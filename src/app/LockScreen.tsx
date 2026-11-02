import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'
import { eraseAllData } from '@/db/backup.ts'
import { Backdrop } from '@/ui/Backdrop.tsx'
import { checkPin, useLock } from './pin.ts'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function LockScreen() {
  const unlock = useLock((s) => s.unlock)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [eraseText, setEraseText] = useState('')

  const press = (k: string) => {
    if (checking) return
    setError(false)
    if (k === 'del') setPin((p) => p.slice(0, -1))
    else if (k) setPin((p) => (p.length < 6 ? p + k : p))
  }

  // Try automatically at 4, 5 and 6 digits, so any PIN length works without an OK button.
  useEffect(() => {
    if (pin.length < 4) return
    let cancelled = false
    setChecking(true)
    void checkPin(pin).then((ok) => {
      if (cancelled) return
      setChecking(false)
      if (ok) unlock()
      else if (pin.length === 6) {
        setError(true)
        setPin('')
      }
    })
    return () => {
      cancelled = true
    }
  }, [pin, unlock])

  // Physical keyboard support on desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (forgot) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6">
      <Backdrop />
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="mb-4 h-16 w-16 rounded-2xl shadow-lg" />
      <h1 className="text-xl font-semibold">Bantay is locked</h1>

      {!forgot ? (
        <>
          <p className={`mt-1 mb-6 h-5 text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-ink/55 dark:text-white/55'}`}>
            {error ? 'Wrong PIN, try again' : 'Enter your PIN'}
          </p>
          <div className={`mb-8 flex gap-3 ${error ? 'animate-[shake_0.3s]' : ''}`} aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full transition ${i < pin.length ? 'bg-accent scale-110' : 'bg-ink/15 dark:bg-white/20'}`}
              />
            ))}
          </div>
          <div className="grid w-full max-w-xs grid-cols-3 gap-3">
            {keys.map((k, i) =>
              k === '' ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  onClick={() => press(k)}
                  aria-label={k === 'del' ? 'Delete' : k}
                  className="glass flex h-16 items-center justify-center rounded-2xl text-2xl font-medium transition active:scale-95"
                >
                  {k === 'del' ? <Delete size={22} /> : k}
                </button>
              ),
            )}
          </div>
          <button onClick={() => setForgot(true)} className="mt-8 text-sm text-ink/50 dark:text-white/50">
            Forgot PIN?
          </button>
        </>
      ) : (
        <div className="glass mt-6 w-full max-w-sm rounded-3xl p-5 text-sm">
          <p className="font-medium">There's no way to recover a forgotten PIN.</p>
          <p className="mt-2 text-ink/60 dark:text-white/60">
            Your PIN never leaves this device, so the only option is to erase Bantay here and start fresh. If you have a backup
            file, you can restore it afterwards in Settings → Backup.
          </p>
          <p className="mt-3 text-ink/60 dark:text-white/60">
            Type <b>ERASE</b> to delete all data on this device.
          </p>
          <input
            value={eraseText}
            onChange={(e) => setEraseText(e.target.value)}
            className="mt-2 w-full rounded-xl bg-ink/[0.05] px-3 py-2.5 outline-none dark:bg-white/[0.07]"
            autoCapitalize="characters"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setForgot(false)} className="flex-1 rounded-xl bg-ink/[0.06] py-2.5 font-medium dark:bg-white/[0.08]">
              Back
            </button>
            <button
              disabled={eraseText.trim() !== 'ERASE'}
              onClick={() => void eraseAllData()}
              className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              Erase everything
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
