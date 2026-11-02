import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface PrivacyStore {
  hidden: boolean
  toggle: () => void
}

/** Hides every amount as ₱**** when on. Remembered on this device. */
export const usePrivacy = create<PrivacyStore>()(
  persist(
    (set) => ({
      hidden: false,
      toggle: () => set((s) => ({ hidden: !s.hidden })),
    }),
    {
      name: 'bantay-privacy',
      storage: createJSONStorage(() => {
        try {
          return localStorage
        } catch {
          // Storage can be blocked (e.g. some private modes); fall back to memory.
          const mem = new Map<string, string>()
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          }
        }
      }),
    },
  ),
)
