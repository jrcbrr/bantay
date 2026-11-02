import type { ID } from './types.ts'

export interface CategoryRule {
  id: ID
  /** Lowercase word or phrase to look for in the note. */
  keyword: string
  categoryId: ID
  /** Learned from your entries (vs. one you added by hand). */
  learned?: boolean
  createdAt: number
}

export const normalizeKeyword = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Word-boundary match, so "ml" doesn't match "html" and "cash" doesn't match "gcash". */
function containsWord(text: string, keyword: string): boolean {
  if (!keyword) return false
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text)
}

/** The rule that fits a note best: the longest matching keyword wins, then the most recent. */
export function matchRule(note: string, rules: readonly CategoryRule[]): CategoryRule | undefined {
  const text = normalizeKeyword(note)
  if (!text) return undefined
  let best: CategoryRule | undefined
  for (const r of rules) {
    if (!containsWord(text, r.keyword)) continue
    if (!best || r.keyword.length > best.keyword.length || (r.keyword.length === best.keyword.length && r.createdAt > best.createdAt))
      best = r
  }
  return best
}

/**
 * What to learn from a note: the note itself, if it's short enough to be a name
 * ("Jollibee", "jeep to school" → "jollibee", "jeep to school"). Long sentences and pure numbers are skipped.
 */
export function keywordFromNote(note: string): string | undefined {
  const k = normalizeKeyword(note).replace(/[^\p{L}\p{N}\s&'-]/gu, '').trim()
  if (k.length < 2 || k.length > 30 || /^\d+$/.test(k) || k.split(' ').length > 4) return undefined
  return k
}

/** Starter rules for common student spending, added once. */
export const starterRules: [keyword: string, categoryId: ID][] = [
  ['jollibee', 'food'],
  ['mcdo', 'food'],
  ['mang inasal', 'food'],
  ['chowking', 'food'],
  ['canteen', 'food'],
  ['lunch', 'food'],
  ['jeep', 'transport'],
  ['fare', 'transport'],
  ['tricycle', 'transport'],
  ['grab', 'transport'],
  ['angkas', 'transport'],
  ['mrt', 'transport'],
  ['lrt', 'transport'],
  ['milk tea', 'coffee'],
  ['starbucks', 'coffee'],
  ['coffee', 'coffee'],
  ['load', 'load'],
  ['netflix', 'subscriptions'],
  ['spotify', 'subscriptions'],
  ['xerox', 'printing'],
  ['print', 'printing'],
  ['7-eleven', 'snacks'],
  ['shopee', 'shopping'],
  ['lazada', 'shopping'],
  ['baon', 'baon'],
]
