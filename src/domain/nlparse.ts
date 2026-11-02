import { parseAmount } from './money.ts'
import type { Centavos, CategoryKind, ID, TransactionType } from './types.ts'

export interface NamedAccount {
  id: ID
  name: string
}

export interface NamedCategory {
  id: ID
  name: string
  kind: CategoryKind
}

export interface ParsedEntry {
  type?: TransactionType
  amount?: Centavos
  accountId?: ID
  toAccountId?: ID
  categoryId?: ID
  note?: string
  /** Days relative to today: 0 = today, -1 = yesterday. */
  dayOffset?: number
}

/**
 * Words that point to a default category id. Covers common Filipino student spending.
 * Matched as whole words or phrases, case-insensitive.
 */
const categoryKeywords: Record<string, string[]> = {
  food: ['mcdo', 'jollibee', 'jabee', 'kfc', 'chowking', 'mang inasal', 'lunch', 'dinner', 'breakfast', 'merienda', 'kain', 'ulam', 'rice', 'meal', 'canteen', 'carinderia', 'tapsilog', 'silog', 'burger', 'pizza'],
  snacks: ['snack', 'snacks', 'chips', 'candy', 'drinks', 'softdrinks', 'coke', 'water', 'fishball', 'kwek', 'ice cream', 'siomai', 'turon', 'bread', 'pandesal'],
  coffee: ['coffee', 'kape', 'starbucks', 'milk tea', 'milktea', 'macao', 'chatime', 'coco', 'tiger sugar', 'frappe'],
  groceries: ['groceries', 'grocery', 'palengke', 'market', 'puregold', 'savemore', 'sm market', '7-eleven', 'alfamart'],
  transport: ['fare', 'pamasahe', 'jeep', 'jeepney', 'tricycle', 'trike', 'bus', 'mrt', 'lrt', 'train', 'grab', 'angkas', 'joyride', 'move it', 'taxi', 'uv', 'gas', 'beep'],
  school: ['tuition', 'school fee', 'miscellaneous', 'enrollment'],
  supplies: ['book', 'books', 'notebook', 'pen', 'paper', 'supplies', 'bond paper', 'national bookstore'],
  printing: ['print', 'printing', 'xerox', 'photocopy', 'project', 'laminate', 'binding'],
  load: ['load', 'data', 'promo', 'globe', 'smart', 'dito', 'tnt', 'tm', 'wifi'],
  subscriptions: ['netflix', 'spotify', 'youtube premium', 'disney', 'icloud', 'google one', 'chatgpt', 'canva', 'subscription'],
  games: ['diamonds', 'ml', 'mlbb', 'codm', 'valorant', 'steam', 'genshin', 'robux', 'roblox', 'top up', 'topup', 'gacha'],
  fun: ['movie', 'cinema', 'gala', 'hangout', 'arcade', 'timezone', 'karaoke', 'videoke', 'concert', 'barkada'],
  shopping: ['shopee', 'lazada', 'tiktok shop', 'shopping', 'order'],
  clothes: ['shirt', 'shoes', 'clothes', 'pants', 'uniform', 'ukay'],
  personal: ['haircut', 'gupit', 'shampoo', 'soap', 'toothpaste', 'skincare', 'perfume', 'deodorant'],
  health: ['medicine', 'gamot', 'biogesic', 'mercury', 'watsons', 'doctor', 'checkup', 'vitamins'],
  'gifts-out': ['gift for', 'regalo', 'treat', 'libre', 'birthday'],
  donation: ['church', 'simbahan', 'offering', 'donation', 'tithe'],
  baon: ['baon', 'allowance'],
  gift: ['pamasko', 'aguinaldo', 'gift', 'bigay', 'ampao'],
  relatives: ['tita', 'tito', 'lola', 'lolo', 'ninang', 'ninong', 'kuya', 'ate'],
  scholarship: ['scholarship', 'stipend', 'grant'],
  sideline: ['commission', 'sideline', 'raket', 'freelance', 'salary', 'sahod', 'tutor'],
  sold: ['sold', 'benta', 'nabenta'],
  refund: ['refund', 'cashback', 'sukli'],
}

const incomeWords = ['got', 'received', 'receive', 'natanggap', 'income', 'binigyan']
const transferInWords = ['cash in', 'cashin', 'deposit', 'top up wallet']
const transferOutWords = ['cash out', 'cashout', 'withdraw', 'withdrew']
const transferWords = ['transfer', 'transferred', 'move', 'moved', 'send to', ...transferInWords, ...transferOutWords]
const dateWords: Record<string, number> = { today: 0, ngayon: 0, yesterday: -1, kahapon: -1 }
const fillerWords = new Set(['to', 'from', 'sa', 'via', 'using', 'with', 'for', 'on', 'at', 'ng', 'kay', 'from:', 'to:', '-', 'php', 'p'])

const norm = (s: string) => s.toLowerCase().trim()

/** Word-boundary phrase search in normalized text. */
function findPhrase(text: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).exec(text)
  return m ? m.index + m[1]!.length : -1
}

/** Remove the first whole-word occurrence of a phrase. */
function strip(text: string, phrase: string): string {
  const i = findPhrase(text, phrase)
  return i < 0 ? text : `${text.slice(0, i)} ${text.slice(i + phrase.length)}`
}

/**
 * Turn "mcdo 189 cash", "baon 150 gcash", "transfer 500 gcash to cash" or
 * "load 50 kahapon" into a draft transaction. Offline, rule-based, forgiving:
 * anything it can't place becomes the note.
 */
export function parseEntry(input: string, accounts: readonly NamedAccount[], categories: readonly NamedCategory[]): ParsedEntry {
  let text = ` ${norm(input).replace(/\s+/g, ' ')} `
  const out: ParsedEntry = {}
  if (!text.trim()) return out

  // Amount: first token that parses ("189", "1,250", "₱99", "1.5k")
  for (const token of text.trim().split(' ')) {
    const amt = parseAmount(token)
    if (amt !== null) {
      out.amount = amt
      text = strip(text, token)
      break
    }
  }

  // Date
  for (const [word, offset] of Object.entries(dateWords)) {
    if (findPhrase(text, word) >= 0) {
      out.dayOffset = offset
      text = strip(text, word)
      break
    }
  }

  // Transfer words go first, so "cash in" isn't read as the Cash account
  const transferWord = transferWords.find((w) => findPhrase(text, w) >= 0)
  if (transferWord) text = strip(text, transferWord)

  // Accounts, in the order they appear (longest names first so "BPI Savings" beats "BPI")
  const found: { id: ID; at: number }[] = []
  for (const a of [...accounts].sort((x, y) => y.name.length - x.name.length)) {
    const name = norm(a.name)
    const at = findPhrase(text, name)
    if (at >= 0 && !found.some((f) => f.id === a.id)) {
      found.push({ id: a.id, at })
      text = strip(text, name)
    }
  }
  found.sort((x, y) => x.at - y.at)

  // Type
  if (transferWord || found.length >= 2) {
    out.type = 'transfer'
    if (found.length >= 2) {
      out.accountId = found[0]!.id
      out.toAccountId = found[1]!.id
    } else if (found[0]) {
      // "cash in 500 gcash" → into GCash; "withdraw 500 bpi" → out of BPI
      if (transferWord && transferInWords.includes(transferWord)) out.toAccountId = found[0].id
      else out.accountId = found[0].id
    }
  } else if (found[0]) {
    out.accountId = found[0].id
  }

  // Category: exact category names first, then keywords
  if (out.type !== 'transfer') {
    let best: { id: ID; len: number } | undefined
    for (const c of categories) {
      const name = norm(c.name)
      if (findPhrase(text, name) >= 0 && (!best || name.length > best.len)) best = { id: c.id, len: name.length }
    }
    if (!best) {
      const known = new Set(categories.map((c) => c.id))
      for (const [id, words] of Object.entries(categoryKeywords)) {
        if (!known.has(id)) continue
        for (const w of words) {
          if (findPhrase(text, w) >= 0 && (!best || w.length > best.len)) best = { id, len: w.length }
        }
      }
    }
    if (best) {
      out.categoryId = best.id
      const kind = categories.find((c) => c.id === best.id)?.kind
      out.type = kind === 'income' ? 'income' : 'expense'
    }
    if (incomeWords.some((w) => findPhrase(text, w) >= 0)) {
      out.type = 'income'
      for (const w of incomeWords) text = strip(text, w)
      if (out.categoryId && categories.find((c) => c.id === out.categoryId)?.kind !== 'income') out.categoryId = undefined
    }
    out.type ??= 'expense'
  }

  // Whatever's left is the note
  const words = text
    .trim()
    .split(' ')
    .filter((w) => w && !fillerWords.has(w))
  if (words.length) {
    const note = words.join(' ')
    // Keep the user's original capitalization when we can find it
    const original = new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'i').exec(input)
    out.note = original ? original[0] : note.charAt(0).toUpperCase() + note.slice(1)
  }

  return out
}
