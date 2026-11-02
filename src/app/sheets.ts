import { create } from 'zustand'
import type { Centavos, ID, Receipt, Transaction, TransactionType } from '@/domain/types.ts'

export interface Prefill {
  type?: TransactionType
  amount?: Centavos
  note?: string
  categoryId?: ID
  accountId?: ID
  /** Wishlist item to mark as bought once this is saved. */
  wishId?: ID
}

interface SheetStore {
  txOpen: boolean
  /** Transaction being edited; undefined when adding a new one. */
  editing?: Transaction
  /** Receipt being turned into a transaction. */
  receipt?: Receipt
  prefill?: Prefill
  openAdd: (opts?: { receipt?: Receipt; prefill?: Prefill }) => void
  openEdit: (tx: Transaction) => void
  close: () => void
}

/** UI-only state for the transaction sheet, so any screen can open it. */
export const useSheets = create<SheetStore>((set) => ({
  txOpen: false,
  editing: undefined,
  receipt: undefined,
  prefill: undefined,
  openAdd: (opts) => set({ txOpen: true, editing: undefined, receipt: opts?.receipt, prefill: opts?.prefill }),
  openEdit: (tx) => set({ txOpen: true, editing: tx, receipt: undefined, prefill: undefined }),
  close: () => set({ txOpen: false }),
}))
