import type { PricingSummary } from '@/types'

// Pure pricing. Term dates/weeks come from the Term row via lib/term.ts; callers
// pass the already-computed `weeksRemaining` so this stays free of any hardcoded
// term calendar.

const WEEKLY_RATES: Record<number, number> = {
  1: 35,
  2: 60,
  3: 80,
}

export const SIBLING_DISCOUNT_RATE = 0.10 // 10% off per additional student

export function weeklyRateFor(subjectsPerStudent: number): number {
  const count = Math.min(3, Math.max(1, subjectsPerStudent))
  return WEEKLY_RATES[count] ?? 35
}

export function calculatePricing(
  subjectsPerStudent: number,
  studentsCount: number,
  weeksRemaining: number,
): PricingSummary {
  const count = Math.min(3, Math.max(1, subjectsPerStudent))
  const weeklyRate = WEEKLY_RATES[count] ?? 35
  const weeks = Math.max(0, weeksRemaining)
  const perStudentTotal = weeklyRate * weeks

  const subtotal = perStudentTotal * studentsCount

  const siblingDiscount = studentsCount > 1
    ? Math.round(perStudentTotal * (studentsCount - 1) * SIBLING_DISCOUNT_RATE)
    : 0

  const total = subtotal - siblingDiscount
  const totalCents = total * 100

  return {
    subjectsPerStudent: count,
    weeksRemaining: weeks,
    weeklyRate,
    perStudentTotal,
    studentsCount,
    subtotal,
    siblingDiscount,
    total,
    totalCents,
  }
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
