import { create } from 'zustand'
import type { Transaction } from '@/domain/types.ts'

interface SheetStore {
  txOpen: boolean
  /** Transaction being edited; undefined when adding a new one. */
  editing?: Transaction
  openAdd: () => void
  openEdit: (tx: Transaction) => void
  close: () => void
}

/** UI-only state for the transaction sheet, so any screen can open it. */
export const useSheets = create<SheetStore>((set) => ({
  txOpen: false,
  editing: undefined,
  openAdd: () => set({ txOpen: true, editing: undefined }),
  openEdit: (tx) => set({ txOpen: true, editing: tx }),
  close: () => set({ txOpen: false }),
}))
