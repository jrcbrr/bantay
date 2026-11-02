import { create } from 'zustand'
import { db } from '@/db/db.ts'

const ITERATIONS = 150_000

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** PBKDF2-SHA256 of the PIN. Only the hash and salt are stored, never the PIN. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin)

export async function setPin(pin: string): Promise<void> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  await db.settings.update('app', { pinSalt: salt, pinHash: await hashPin(pin, salt) })
}

export async function removePin(): Promise<void> {
  await db.settings.update('app', { pinHash: undefined, pinSalt: undefined })
}

export async function checkPin(pin: string): Promise<boolean> {
  const s = await db.settings.get('app')
  if (!s?.pinHash || !s.pinSalt) return true
  return (await hashPin(pin, s.pinSalt)) === s.pinHash
}

interface LockStore {
  /** Starts locked; the shell only enforces it when a PIN is set. */
  locked: boolean
  hiddenAt: number | null
  lock: () => void
  unlock: () => void
}

export const useLock = create<LockStore>((set) => ({
  locked: true,
  hiddenAt: null,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
}))

/** Re-lock after the app has been in the background for a minute. */
export function watchVisibility(): () => void {
  const onChange = () => {
    if (document.visibilityState === 'hidden') useLock.setState({ hiddenAt: Date.now() })
    else {
      const { hiddenAt } = useLock.getState()
      if (hiddenAt && Date.now() - hiddenAt > 60_000) useLock.setState({ locked: true })
      useLock.setState({ hiddenAt: null })
    }
  }
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}
