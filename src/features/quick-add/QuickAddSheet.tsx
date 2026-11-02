import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Receipt as ReceiptIcon, Trash2, X } from 'lucide-react'
import { useSheets } from '@/app/sheets.ts'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '@/db/db.ts'
import { useAccounts, useCategories, useEvents, useSettings } from '@/db/hooks.ts'
import { isSpendable } from '@/domain/balance.ts'
import { eventsOn, roundUpAmount } from '@/domain/planExtras.ts'
import { toISODate, today } from '@/domain/dates.ts'
import { parseAmount } from '@/domain/money.ts'
import type { Template, TransactionType } from '@/domain/types.ts'
import { AccountIcon } from '@/ui/AccountIcon.tsx'
import { CategoryIcon } from '@/ui/CategoryIcon.tsx'
import { addReceipt } from '@/features/receipts/receipts.ts'

const types: [TransactionType, string][] = [
  ['expense', 'Expense'],
  ['income', 'Income'],
  ['transfer', 'Transfer'],
]

export function QuickAddSheet() {
  const open = useSheets((s) => s.txOpen)
  const editing = useSheets((s) => s.editing)
  const receipt = useSheets((s) => s.receipt)
  const prefill = useSheets((s) => s.prefill)
  const settings = useSettings()
  const events = useEvents()
  const [eventId, setEventId] = useState('')
  const onClose = useSheets((s) => s.close)

  const accounts = useAccounts()
  const categories = useCategories()
  const templates = useLiveQuery(() => db.templates.filter((t) => !!t.pinned).toArray(), []) ?? []

  const [type, setType] = useState<TransactionType>('expense')
  const [amountText, setAmountText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => toISODate(today()))

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [snapNote, setSnapNote] = useState('')
  const [zoom, setZoom] = useState(false)
  const cameraInput = useRef<HTMLInputElement>(null)

  // Photo attached to the transaction being edited, if any.
  const linkedReceiptId = editing?.receiptId
  const linkedImage = useLiveQuery(
    async () => (linkedReceiptId ? (await db.receipts.get(linkedReceiptId))?.image : undefined),
    [linkedReceiptId],
  )
  const photo = receipt?.image ?? linkedImage

  // Reset (or load the transaction being edited) each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setSnapNote('')
    setZoom(false)
    if (editing) {
      setType(editing.type)
      setAmountText(String(editing.amount / 100))
      setAccountId(editing.accountId)
      if (editing.toAccountId) setToAccountId(editing.toAccountId)
      setCategoryId(editing.categoryId ?? '')
      setNote(editing.note ?? '')
      setDate(editing.date)
      setEventId(editing.eventId ?? '')
    } else {
      setType(prefill?.type ?? 'expense')
      setAmountText(prefill?.amount ? String(prefill.amount / 100) : '')
      setNote(prefill?.note ?? '')
      setCategoryId(prefill?.categoryId ?? '')
      if (prefill?.accountId) setAccountId(prefill.accountId)
      setDate(toISODate(today()))
      setEventId('')
    }
  }, [open, editing, prefill])

  const activeEvents = eventsOn(events, date)

  const chooseType = (t: TransactionType) => {
    // Expense and income categories don't overlap, so clear the pick when switching.
    if (t !== type) setCategoryId('')
    setType(t)
  }

  // Default to the first account once accounts load.
  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
    if (!toAccountId && accounts[1]) setToAccountId(accounts[1].id)
  }, [accounts, accountId, toAccountId])

  const amount = parseAmount(amountText)
  const visibleCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
  const canSave =
    amount !== null && !!accountId && (type !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const applyTemplate = (t: Template) => {
    setType(t.type)
    if (t.amount) setAmountText(String(t.amount / 100))
    if (t.accountId) setAccountId(t.accountId)
    if (t.toAccountId) setToAccountId(t.toAccountId)
    setCategoryId(t.categoryId ?? '')
    setNote(t.note ?? '')
  }

  const save = async () => {
    if (!canSave || amount === null) return
    const fields = {
      type,
      amount,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId || undefined,
      note: note.trim() || undefined,
      date,
      eventId: type === 'expense' && activeEvents.some((e) => e.id === eventId) ? eventId : undefined,
    }
    if (editing) {
      await db.transactions.update(editing.id, fields)
    } else {
      const id = newId()
      const from = accounts.find((a) => a.id === accountId)
      const ru = settings?.roundUp
      const extra = type === 'expense' && ru && from && isSpendable(from) && ru.accountId !== accountId ? roundUpAmount(amount, ru.toPesos) : 0
      await db.transaction('rw', [db.transactions, db.receipts, db.wishlist], async () => {
        await db.transactions.add({ id, ...fields, receiptId: receipt?.id, createdAt: Date.now() })
        if (receipt) await db.receipts.update(receipt.id, { status: 'done', transactionId: id })
        // Round-up: move the spare change to savings.
        if (extra > 0 && ru) {
          await db.transactions.add({
            id: newId(),
            type: 'transfer',
            amount: extra,
            accountId,
            toAccountId: ru.accountId,
            note: 'Round-up',
            date,
            roundUpOf: id,
            createdAt: Date.now() + 1,
          })
        }
        if (prefill?.wishId) await db.wishlist.update(prefill.wishId, { bought: true })
      })
    }
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    if (!confirmDelete) return setConfirmDelete(true)
    await db.transaction('rw', db.transactions, db.receipts, async () => {
      await db.transactions.delete(editing.id)
      // Its round-up goes too.
      await db.transactions.where('roundUpOf').equals(editing.id).delete()
      // Send its receipt back to the inbox instead of losing the photo.
      if (editing.receiptId) await db.receipts.update(editing.receiptId, { status: 'pending', transactionId: undefined })
    })
    onClose()
  }

  /** Quick capture: save the photo to the inbox and deal with it later. */
  const snapForLater = async (file: File | undefined) => {
    if (!file) return
    try {
      await addReceipt(file)
      setSnapNote('Saved to your receipts inbox')
      setTimeout(onClose, 700)
    } catch {
      setSnapNote('Could not read that photo')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Edit transaction' : 'Add transaction'}
            className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[2rem] bg-paper/80! p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-6 md:rounded-[2rem] dark:bg-ink/80!"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex rounded-xl bg-ink/[0.05] p-1 dark:bg-white/[0.07]">
                {types.map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => chooseType(v)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      type === v ? 'bg-accent text-white shadow' : 'text-ink/55 dark:text-white/55'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-ink/5 dark:hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            {photo && (
              <button
                onClick={() => setZoom(true)}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-ink/[0.04] p-2 text-left dark:bg-white/[0.06]"
              >
                <img src={photo} alt="Receipt" className="h-14 w-14 rounded-xl object-cover" />
                <span className="flex items-center gap-1.5 text-sm text-ink/60 dark:text-white/60">
                  <ReceiptIcon size={16} /> Receipt attached · tap to view
                </span>
              </button>
            )}

            {!editing && !receipt && (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                <button
                  onClick={() => cameraInput.current?.click()}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-medium dark:bg-white/[0.08]"
                >
                  <Camera size={14} /> Snap receipt for later
                </button>
                <input
                  ref={cameraInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    void snapForLater(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="shrink-0 rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent dark:text-accent-soft"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {snapNote && <p className="text-accent dark:text-accent-soft -mt-2 mb-3 text-sm font-medium">{snapNote}</p>}

            <label className="block">
              <span className="sr-only">Amount</span>
              <div className="flex items-baseline gap-1 border-b border-ink/10 pb-2 dark:border-white/10">
                <span className="text-2xl text-ink/40 dark:text-white/40">₱</span>
                <input
                  autoFocus={!editing}
                  inputMode="decimal"
                  placeholder="0"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void save()}
                  className="tabular w-full bg-transparent text-5xl font-semibold tracking-tight outline-none placeholder:text-ink/20 dark:placeholder:text-white/20"
                />
              </div>
            </label>

            <Section title={type === 'income' ? 'Into' : 'From'}>
              <Chips
                items={accounts.map((a) => [a.id, a.name, <AccountIcon account={a} size={20} />])}
                value={accountId}
                onChange={setAccountId}
              />
            </Section>

            {type === 'transfer' ? (
              <Section title="To">
                <Chips
                  items={accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => [a.id, a.name, <AccountIcon account={a} size={20} />])}
                  value={toAccountId}
                  onChange={setToAccountId}
                />
              </Section>
            ) : (
              <Section title="Category">
                <Chips
                  items={visibleCategories.map((c) => [c.id, c.name, <CategoryIcon category={c} />])}
                  value={categoryId}
                  onChange={(v) => setCategoryId(v === categoryId ? '' : v)}
                />
              </Section>
            )}

            {type === 'expense' && activeEvents.length > 0 && (
              <Section title="Count toward">
                <Chips
                  items={[['', 'None'], ...activeEvents.map((e): [string, string] => [e.id, e.name])]}
                  value={eventId}
                  onChange={setEventId}
                />
              </Section>
            )}

            <div className="mt-4 flex gap-2">
              <input
                placeholder="Note (e.g. McDo)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 rounded-xl bg-ink/[0.05] px-3 py-2.5 text-sm outline-none dark:bg-white/[0.07]"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl bg-ink/[0.05] px-3 py-2.5 text-sm outline-none dark:bg-white/[0.07]"
              />
            </div>

            <div className="mt-5 flex gap-2">
              {editing && (
                <button
                  onClick={() => void remove()}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                    confirmDelete
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  <Trash2 size={18} />
                  {confirmDelete ? 'Tap to confirm' : ''}
                  <span className="sr-only">Delete</span>
                </button>
              )}
              <button
                disabled={!canSave}
                onClick={() => void save()}
                className="bg-accent flex-1 rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-accent/30 transition active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
              >
                {editing ? 'Save changes' : 'Save'}
              </button>
            </div>
          </motion.div>
          {zoom && photo && (
            <button
              aria-label="Close receipt"
              onClick={() => setZoom(false)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
            >
              <img src={photo} alt="Receipt" className="max-h-full max-w-full rounded-xl object-contain" />
            </button>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase dark:text-white/45">{title}</p>
      {children}
    </div>
  )
}

function Chips({
  items,
  value,
  onChange,
}: {
  items: [id: string, label: string, icon?: ReactNode][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([id, label, icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 rounded-full py-1.5 text-sm transition ${icon ? 'pr-3 pl-1.5' : 'px-3'} ${
            value === id
              ? 'bg-ink text-white dark:bg-white dark:text-ink'
              : 'bg-ink/[0.05] text-ink/70 dark:bg-white/[0.07] dark:text-white/70'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}
