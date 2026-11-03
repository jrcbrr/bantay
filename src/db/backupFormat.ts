import { z } from 'zod'

/** Tables included in a backup, in restore order. */
export const BACKUP_TABLES = [
  'settings',
  'accounts',
  'categories',
  'templates',
  'transactions',
  'budgets',
  'goals',
  'recurring',
  'installments',
  'debts',
  'assets',
  'receipts',
  'events',
  'challenges',
  'wishlist',
  'rules',
  'archives',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

const row = z.object({ id: z.string().min(1) }).passthrough()
const money = z.number().int()

// Key tables get real checks so a corrupted entry can't sneak bad money values in.
// Each row is checked on its own: a damaged row is skipped instead of failing the whole restore.
const rowSchemas: Record<BackupTable, z.ZodTypeAny> = {
  settings: row,
  accounts: row.extend({ name: z.string(), kind: z.enum(['cash', 'bank', 'ewallet', 'credit']), openingBalance: money }),
  categories: row.extend({ name: z.string(), kind: z.enum(['expense', 'income']) }),
  templates: row,
  transactions: row.extend({
    type: z.enum(['expense', 'income', 'transfer']),
    amount: money.nonnegative(),
    accountId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  budgets: row,
  goals: row,
  recurring: row,
  installments: row,
  debts: row,
  assets: row,
  receipts: row,
  events: row,
  challenges: row,
  wishlist: row,
  rules: row,
  archives: row,
}

const headerSchema = z.object({
  app: z.literal('bantay'),
  format: z.coerce.number().refine((n) => n === 1),
  exportedAt: z.string().optional(),
  data: z.record(z.unknown()),
})

export interface BackupFile {
  app: 'bantay'
  format: 1
  exportedAt: string
  data: Record<BackupTable, { id: string; [k: string]: unknown }[]>
}

export type ParseResult =
  | { ok: true; backup: BackupFile; counts: Record<BackupTable, number>; skipped: number }
  | { ok: false; error: string }

/**
 * Check a backup file before anything is touched. Never throws.
 * Forgiving on purpose: ignores a byte-order mark or stray text around the JSON
 * (some phones add it when saving), and skips individual damaged rows.
 */
export function parseBackup(text: string): ParseResult {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) return { ok: false, error: "That file isn't a Bantay backup. Pick the file named bantay-backup-….json." }

  let json: unknown
  try {
    json = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return { ok: false, error: 'That backup file is incomplete or damaged (it may not have finished downloading).' }
  }

  const head = headerSchema.safeParse(json)
  if (!head.success) return { ok: false, error: "That file isn't a Bantay backup, or it's from a newer version of the app." }

  const data = {} as BackupFile['data']
  let skipped = 0
  let total = 0
  for (const t of BACKUP_TABLES) {
    const raw = head.data.data[t]
    const rows: BackupFile['data'][BackupTable] = []
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const r = rowSchemas[t].safeParse(item)
        if (r.success) rows.push(r.data as BackupFile['data'][BackupTable][number])
        else skipped++
      }
    }
    data[t] = rows
    total += rows.length
  }
  if (total === 0) return { ok: false, error: 'That backup is empty, so there is nothing to restore.' }

  const backup: BackupFile = { app: 'bantay', format: 1, exportedAt: head.data.exportedAt ?? '', data }
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length])) as Record<BackupTable, number>
  return { ok: true, backup, counts, skipped }
}

/** Escape a value for CSV (RFC 4180). */
export function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
