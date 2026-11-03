import { toISODate, today } from '@/domain/dates.ts'
import { BACKUP_TABLES, csvCell, type BackupFile } from './backupFormat.ts'
import Dexie, { type EntityTable } from 'dexie'
import { paymentsFromLegacy } from '@/domain/credit.ts'
import type { Debt, Transaction } from '@/domain/types.ts'
import { addStarterRules, db } from './db.ts'

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Read every table into a backup object. */
async function snapshot(): Promise<BackupFile> {
  const data = {} as BackupFile['data']
  await db.transaction('r', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const t of BACKUP_TABLES) data[t] = await db.table(t).toArray()
  })
  return { app: 'bantay', format: 1, exportedAt: new Date().toISOString(), data }
}

/**
 * Save everything (receipts and photos included) as one JSON file.
 * On phones that support it, this opens the share sheet so you can pick
 * "Save to Files", Google Drive, etc. — more reliable than a browser download.
 * Returns false if you cancelled.
 */
export async function downloadBackup(): Promise<boolean> {
  const json = JSON.stringify(await snapshot())
  const name = `bantay-backup-${toISODate(today())}.json`
  const file = new File([json], name, { type: 'application/json' })
  const isPhone = window.matchMedia('(pointer: coarse)').matches
  if (isPhone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Bantay backup' })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      download(name, json, 'application/octet-stream')
    }
  } else {
    download(name, json, 'application/octet-stream')
  }
  await db.settings.update('app', { lastBackupAt: Date.now() })
  return true
}

/* ---------- Safety copy, so a restore can be undone ---------- */

interface SafetyCopy {
  id: 'last'
  createdAt: number
  json: string
}

class SafetyDB extends Dexie {
  declare copies: EntityTable<SafetyCopy, 'id'>
  constructor() {
    super('bantay-safety')
    this.version(1).stores({ copies: 'id' })
  }
}

export const safetyDb = new SafetyDB()

/** Replace all data on this device with a validated backup. All-or-nothing. Keeps a safety copy first. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const current = await snapshot()
  const hasData = BACKUP_TABLES.some((t) => t !== 'settings' && t !== 'categories' && t !== 'rules' && current.data[t].length > 0)
  if (hasData) await safetyDb.copies.put({ id: 'last', createdAt: Date.now(), json: JSON.stringify(current) })
  await writeAll(upgradeBackup(backup))
  // Backups from before auto-categorize have no rules: add the starters.
  if (backup.data.rules.length === 0) await addStarterRules(db.rules)
}

/** Bring a backup from an older version up to date (debts used to move money; now they don't). */
function upgradeBackup(backup: BackupFile): BackupFile {
  const txs = backup.data.transactions as unknown as Transaction[]
  if (!txs.some((t) => t.debtId)) return backup
  const debts = (backup.data.debts as unknown as Debt[]).map((d) => ({ ...d, payments: paymentsFromLegacy(d, txs) }))
  return {
    ...backup,
    data: {
      ...backup.data,
      debts: debts as unknown as BackupFile['data']['debts'],
      transactions: backup.data.transactions.filter((t) => !(t as unknown as Transaction).debtId),
    },
  }
}

async function writeAll(backup: BackupFile): Promise<void> {
  await db.transaction('rw', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const t of BACKUP_TABLES) {
      await db.table(t).clear()
      if (backup.data[t].length) await db.table(t).bulkPut(backup.data[t])
    }
  })
}

/** Put back the data from right before the last restore. */
export async function undoRestore(): Promise<boolean> {
  const copy = await safetyDb.copies.get('last')
  if (!copy) return false
  await writeAll(JSON.parse(copy.json) as BackupFile)
  await safetyDb.copies.delete('last')
  return true
}

/** Transactions as a spreadsheet-friendly CSV (amounts in pesos). */
export async function downloadCsv(): Promise<void> {
  const [txs, accounts, categories] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ])
  const acc = new Map(accounts.map((a) => [a.id, a.name]))
  const cat = new Map(categories.map((c) => [c.id, c.name]))
  const header = ['Date', 'Type', 'Amount (PHP)', 'Account', 'To account', 'Category', 'Note']
  const rows = txs.map((t) => [
    t.date,
    t.type,
    (t.type === 'expense' ? -t.amount : t.amount) / 100,
    acc.get(t.accountId),
    t.toAccountId ? acc.get(t.toAccountId) : '',
    t.categoryId ? cat.get(t.categoryId) : '',
    t.note ?? '',
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => csvCell(v)).join(',')).join('\r\n')
  // BOM so Excel opens the ₱ and accented names correctly
  download(`bantay-transactions-${toISODate(today())}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
}

/** Wipe everything (used by "forgot PIN"). The app re-seeds on next load. */
export async function eraseAllData(): Promise<void> {
  await db.delete()
  location.reload()
}
