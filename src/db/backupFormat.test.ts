import { describe, expect, it } from 'vitest'
import { csvCell, parseBackup } from './backupFormat.ts'

const valid = {
  app: 'bantay',
  format: 1,
  exportedAt: '2026-11-03T00:00:00.000Z',
  data: {
    accounts: [{ id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 0, createdAt: 1 }],
    transactions: [{ id: 't1', type: 'expense', amount: 18900, accountId: 'cash', date: '2026-11-03', note: 'McDo' }],
  },
}

describe('parseBackup', () => {
  it('accepts a valid file, fills missing tables, and keeps extra fields', () => {
    const r = parseBackup(JSON.stringify(valid))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.counts.transactions).toBe(1)
    expect(r.counts.assets).toBe(0)
    expect(r.backup.data.transactions[0]?.note).toBe('McDo')
  })

  it('rejects non-JSON and other apps', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ ...valid, app: 'other' })).ok).toBe(false)
  })

  it('rejects bad money values', () => {
    const bad = structuredClone(valid)
    bad.data.transactions[0]!.amount = 189.5
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })
})

describe('csvCell', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell(undefined)).toBe('')
  })
})
