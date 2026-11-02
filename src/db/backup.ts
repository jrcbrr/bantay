import { toISODate, today } from '@/domain/dates.ts'
import { BACKUP_TABLES, csvCell, type BackupFile } from './backupFormat.ts'
import { db } from './db.ts'

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

/** Download everything (receipts and photos included) as one JSON file. */
export async function downloadBackup(): Promise<void> {
  const data = {} as BackupFile['data']
  await db.transaction('r', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const t of BACKUP_TABLES) data[t] = await db.table(t).toArray()
  })
  const file: BackupFile = { app: 'bantay', format: 1, exportedAt: new Date().toISOString(), data }
  download(`bantay-backup-${toISODate(today())}.json`, JSON.stringify(file), 'application/json')
  await db.settings.update('app', { lastBackupAt: Date.now() })
}

/** Replace all data on this device with a validated backup. All-or-nothing. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const t of BACKUP_TABLES) {
      await db.table(t).clear()
      if (backup.data[t].length) await db.table(t).bulkAdd(backup.data[t])
    }
  })
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
  download(`bantay-transactions-${toISODate(today())}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8')
}

/** Wipe everything (used by "forgot PIN"). The app re-seeds on next load. */
export async function eraseAllData(): Promise<void> {
  await db.delete()
  location.reload()
}
