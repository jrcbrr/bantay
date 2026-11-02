import { useState } from 'react'
import { Lock } from 'lucide-react'
import { checkPin, isValidPin, removePin, setPin } from '@/app/pin.ts'
import { useSettings } from '@/db/hooks.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'

type Mode = 'idle' | 'set' | 'change' | 'off'

const input =
  'tabular w-full rounded-xl bg-ink/[0.05] px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none dark:bg-white/[0.07]'

export function PinCard() {
  const hasPin = !!useSettings()?.pinHash
  const [mode, setMode] = useState<Mode>('idle')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const start = (m: Mode) => {
    setMode(m)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setDone('')
  }

  const submit = async () => {
    setError('')
    if (mode !== 'set' && !(await checkPin(current))) return setError('Current PIN is wrong.')
    if (mode === 'off') {
      await removePin()
      start('idle')
      return setDone('PIN lock turned off.')
    }
    if (!isValidPin(next)) return setError('Use 4 to 6 digits.')
    if (next !== confirm) return setError("The two PINs don't match.")
    await setPin(next)
    start('idle')
    setDone(mode === 'set' ? 'PIN lock is on. Bantay will ask for it when you open the app.' : 'PIN changed.')
  }

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6)

  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <Lock size={20} className="text-accent dark:text-accent-soft" />
        <div className="flex-1">
          <h2 className="font-semibold">PIN lock</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">
            {hasPin ? 'On: asks for your PIN when you open Bantay' : 'Off'}
          </p>
        </div>
        {mode === 'idle' &&
          (hasPin ? (
            <div className="flex gap-2">
              <button onClick={() => start('change')} className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold dark:bg-white/[0.08]">
                Change
              </button>
              <button onClick={() => start('off')} className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-xs font-semibold dark:bg-white/[0.08]">
                Turn off
              </button>
            </div>
          ) : (
            <button onClick={() => start('set')} className="bg-accent rounded-full px-3 py-1.5 text-xs font-semibold text-white">
              Set PIN
            </button>
          ))}
      </div>

      {mode !== 'idle' && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {mode !== 'set' && (
            <input
              className={input}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Current PIN"
              value={current}
              onChange={(e) => setCurrent(digits(e.target.value))}
              autoFocus
            />
          )}
          {mode !== 'off' && (
            <>
              <input
                className={input}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="New PIN (4–6 digits)"
                value={next}
                onChange={(e) => setNext(digits(e.target.value))}
                autoFocus={mode === 'set'}
              />
              <input
                className={input}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Repeat new PIN"
                value={confirm}
                onChange={(e) => setConfirm(digits(e.target.value))}
              />
            </>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => start('idle')} className="flex-1 rounded-xl bg-ink/[0.06] py-2.5 text-sm font-medium dark:bg-white/[0.08]">
              Cancel
            </button>
            <button type="submit" className="bg-accent flex-1 rounded-xl py-2.5 text-sm font-semibold text-white">
              {mode === 'off' ? 'Turn off' : 'Save PIN'}
            </button>
          </div>
          {mode === 'set' && (
            <p className="text-xs text-ink/50 dark:text-white/50">
              This keeps people from opening Bantay on your phone. It doesn't encrypt your data, and a forgotten PIN can't be
              recovered, so keep a backup.
            </p>
          )}
        </form>
      )}
      {done && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
    </GlassCard>
  )
}
