import { describe, expect, it } from 'vitest'
import { currentCycle, safeToSpendToday } from './allowance.ts'

// Tue 3 Nov 2026
const now = new Date(2026, 10, 3, 14, 30)

describe('currentCycle', () => {
  it('daily: one day left', () => {
    const c = currentCycle(now, { cycle: 'daily', weekday: 0, dayOfMonth: 1 })
    expect(c).toEqual({ start: '2026-11-03', nextAllowance: '2026-11-04', daysLeft: 1 })
  })

  it('weekly on Monday: started yesterday, 6 days left', () => {
    const c = currentCycle(now, { cycle: 'weekly', weekday: 1, dayOfMonth: 1 })
    expect(c).toEqual({ start: '2026-11-02', nextAllowance: '2026-11-09', daysLeft: 6 })
  })

  it('weekly on the same weekday as today: cycle starts today', () => {
    const c = currentCycle(now, { cycle: 'weekly', weekday: 2, dayOfMonth: 1 })
    expect(c.start).toBe('2026-11-03')
    expect(c.daysLeft).toBe(7)
  })

  const school = { cycle: 'days', weekday: 0, dayOfMonth: 1, days: [1, 2, 3, 4, 5] } as const

  it('school days on a Tuesday: baon today, next one tomorrow', () => {
    expect(currentCycle(now, school)).toEqual({ start: '2026-11-03', nextAllowance: '2026-11-04', daysLeft: 1 })
  })

  it("school days on a Friday: Friday's baon lasts until Monday", () => {
    const fri = new Date(2026, 10, 6, 9)
    expect(currentCycle(fri, school)).toEqual({ start: '2026-11-06', nextAllowance: '2026-11-09', daysLeft: 3 })
  })

  it('school days on a Saturday: still in Friday’s cycle', () => {
    const sat = new Date(2026, 10, 7, 9)
    expect(currentCycle(sat, school)).toEqual({ start: '2026-11-06', nextAllowance: '2026-11-09', daysLeft: 2 })
  })

  it('days with no days picked behaves like daily', () => {
    const c = currentCycle(now, { cycle: 'days', weekday: 0, dayOfMonth: 1, days: [] })
    expect(c.daysLeft).toBe(1)
  })

  it('monthly on the 15th: cycle started last month', () => {
    const c = currentCycle(now, { cycle: 'monthly', weekday: 0, dayOfMonth: 15 })
    expect(c).toEqual({ start: '2026-10-15', nextAllowance: '2026-11-15', daysLeft: 12 })
  })
})

describe('safeToSpendToday', () => {
  it('spreads available money across remaining days', () => {
    expect(safeToSpendToday({ available: 70000, upcomingBills: 0, spentToday: 0, daysLeft: 7 })).toBe(10000)
  })

  it('reserves upcoming bills first', () => {
    expect(safeToSpendToday({ available: 70000, upcomingBills: 14000, spentToday: 0, daysLeft: 7 })).toBe(8000)
  })

  it('shrinks as you spend today', () => {
    // Started day with ₱700, spent ₱60 → ₱640 left, 7 days → ₱100/day budget, ₱40 left today
    expect(safeToSpendToday({ available: 64000, upcomingBills: 0, spentToday: 6000, daysLeft: 7 })).toBe(4000)
  })

  it('never goes negative', () => {
    expect(safeToSpendToday({ available: 1000, upcomingBills: 5000, spentToday: 0, daysLeft: 3 })).toBe(0)
    expect(safeToSpendToday({ available: 0, upcomingBills: 0, spentToday: 20000, daysLeft: 2 })).toBe(0)
  })
})
