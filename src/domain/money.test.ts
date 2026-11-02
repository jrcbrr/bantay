import { describe, expect, it } from 'vitest'
import { formatPHP, parseAmount } from './money.ts'

describe('parseAmount', () => {
  it.each([
    ['150', 15000],
    ['1,250.50', 125050],
    ['₱99', 9900],
    ['2.5k', 250000],
    ['25K', 2500000],
    ['.5', 50],
  ])('parses %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', 'abc', '0', '-5', '1.2.3'])('rejects %s', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

describe('formatPHP', () => {
  it('formats with peso sign and two decimals', () => {
    expect(formatPHP(123450)).toBe('₱1,234.50')
  })
  it('shows a minus for negatives and optional plus', () => {
    expect(formatPHP(-500)).toBe('−₱5.00')
    expect(formatPHP(500, { sign: true })).toBe('+₱5.00')
  })
})
