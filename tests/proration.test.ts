import { describe, it, expect } from 'vitest'
import { calculatePricing } from '@/lib/proration'

// Term weeks now come from the Term row (lib/term); calculatePricing is pure and
// takes weeksRemaining directly, so these tests stay free of any DB import.
describe('pricing / proration', () => {
  it('uses the right weekly rate per subject count', () => {
    expect(calculatePricing(1, 1, 10).weeklyRate).toBe(35)
    expect(calculatePricing(2, 1, 10).weeklyRate).toBe(60)
    expect(calculatePricing(3, 1, 10).weeklyRate).toBe(80)
  })

  it('prices a (full or partial) term at weeklyRate x weeks', () => {
    expect(calculatePricing(1, 1, 10).totalCents).toBe(35 * 10 * 100)
    expect(calculatePricing(1, 1, 2).totalCents).toBe(35 * 2 * 100)
  })

  it('applies a 10% sibling discount for 2+ students', () => {
    const one = calculatePricing(2, 1, 10)
    const two = calculatePricing(2, 2, 10)
    expect(two.siblingDiscount).toBeGreaterThan(0)
    // Two students should cost less than double one (discount applied).
    expect(two.total).toBeLessThan(one.total * 2)
  })

  it('total always equals totalCents / 100', () => {
    const p = calculatePricing(3, 2, 10)
    expect(p.totalCents).toBe(p.total * 100)
  })

  it('clamps negative weeks to zero', () => {
    expect(calculatePricing(1, 1, -5).totalCents).toBe(0)
  })
})
