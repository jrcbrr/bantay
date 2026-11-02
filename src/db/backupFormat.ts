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
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

const row = z.object({ id: z.string().min(1) }).passthrough()
const money = z.number().int()

// Key tables get real checks so a corrupted file can't sneak bad money values in.
const tableSchemas: Record<BackupTable, z.ZodTypeAny> = {
  settings: z.array(row),
  accounts: z.array(row.extend({ name: z.string(), kind: z.enum(['cash', 'bank', 'ewallet', 'credit']), openingBalance: money })),
  categories: z.array(row.extend({ name: z.string(), kind: z.enum(['expense', 'income']) })),
  templates: z.array(row),
  transactions: z.array(
    row.extend({
      type: z.enum(['expense', 'income', 'transfer']),
      amount: money.nonnegative(),
      accountId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ),
  budgets: z.array(row),
  goals: z.array(row),
  recurring: z.array(row),
  installments: z.array(row),
  debts: z.array(row),
  assets: z.array(row),
  receipts: z.array(row),
  events: z.array(row),
  challenges: z.array(row),
  wishlist: z.array(row),
}

const dataShape = {} as Record<BackupTable, z.ZodTypeAny>
for (const t of BACKUP_TABLES) dataShape[t] = tableSchemas[t].optional().default([])

const backupSchema = z.object({
  app: z.literal('bantay'),
  format: z.literal(1),
  exportedAt: z.string(),
  data: z.object(dataShape),
})

export interface BackupFile {
  app: 'bantay'
  format: 1
  exportedAt: string
  data: Record<BackupTable, { id: string; [k: string]: unknown }[]>
}

export type ParseResult = { ok: true; backup: BackupFile; counts: Record<BackupTable, number> } | { ok: false; error: string }

/** Check a backup file before anything is touched. Never throws. */
export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't a Bantay backup (not valid JSON)." }
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.join('.') ?? ''
    if (where === 'app' || where === 'format')
      return { ok: false, error: "That file isn't a Bantay backup, or it's from a newer version of the app." }
    return { ok: false, error: `The backup looks damaged (${where || 'file'}: ${issue?.message ?? 'invalid'}).` }
  }
  const backup = result.data as BackupFile
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, backup.data[t].length])) as Record<BackupTable, number>
  return { ok: true, backup, counts }
}

/** Escape a value for CSV (RFC 4180). */
export function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
