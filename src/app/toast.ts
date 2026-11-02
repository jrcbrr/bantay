import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  /** Shows an Undo button that runs this. */
  undo?: () => Promise<void> | void
}

interface ToastStore {
  toast: Toast | null
  show: (message: string, undo?: Toast['undo']) => void
  dismiss: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

/** One toast at a time; a new one replaces the old. Disappears after 5 seconds. */
export const useToast = create<ToastStore>((set) => ({
  toast: null,
  show: (message, undo) => {
    clearTimeout(timer)
    const id = ++seq
    set({ toast: { id, message, undo } })
    timer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 5000)
  },
  dismiss: () => {
    clearTimeout(timer)
    set({ toast: null })
  },
}))

export const showToast = (message: string, undo?: Toast['undo']) => useToast.getState().show(message, undo)
