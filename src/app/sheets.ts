import { create } from 'zustand'
import type { Receipt, Transaction } from '@/domain/types.ts'

interface SheetStore {
  txOpen: boolean
  /** Transaction being edited; undefined when adding a new one. */
  editing?: Transaction
  /** Receipt being turned into a transaction. */
  receipt?: Receipt
  openAdd: (opts?: { receipt?: Receipt }) => void
  openEdit: (tx: Transaction) => void
  close: () => void
}

/** UI-only state for the transaction sheet, so any screen can open it. */
export const useSheets = create<SheetStore>((set) => ({
  txOpen: false,
  editing: undefined,
  receipt: undefined,
  openAdd: (opts) => set({ txOpen: true, editing: undefined, receipt: opts?.receipt }),
  openEdit: (tx) => set({ txOpen: true, editing: tx, receipt: undefined }),
  close: () => set({ txOpen: false }),
}))
