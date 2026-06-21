import { describe, it, expect } from 'vitest'
import { rowHash, type ChainContent } from '@/lib/audit-chain'
import { cosine } from '@/lib/embeddings'
import { estimateCostCents } from '@/lib/ai-cost'

const base: ChainContent = {
  actorId: 'u1', action: 'Student.update', kind: 'update', entity: 'Student',
  entityId: 's1', before: '{"a":1}', after: '{"a":2}', createdAt: '2026-06-21T00:00:00.000Z',
}

describe('audit hash-chain', () => {
  it('is deterministic for the same input', () => {
    expect(rowHash('prev', base)).toBe(rowHash('prev', base))
  })

  it('changes when any content changes (tamper detection)', () => {
    const tampered = { ...base, after: '{"a":3}' }
    expect(rowHash('prev', tampered)).not.toBe(rowHash('prev', base))
  })

  it('depends on the previous hash (chain linkage)', () => {
    expect(rowHash('A', base)).not.toBe(rowHash('B', base))
  })
})

describe('embeddings cosine + local embed', () => {
  it('a vector is perfectly similar to itself', () => {
    const v = [0.1, 0.2, 0.3]
    expect(cosine(v, v)).toBeCloseTo(1, 6)
  })

  it('orthogonal vectors score 0; mismatched lengths score 0', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 6)
    expect(cosine([1, 0, 0], [1, 0])).toBe(0)
  })
})

describe('AI cost estimate tiers', () => {
  it('prices Opus far above Haiku for the same tokens', () => {
    const opus = estimateCostCents('claude-opus-4-8', 1000, 1000)
    const haiku = estimateCostCents('claude-haiku-4-5', 1000, 1000)
    expect(opus).toBeGreaterThan(haiku)
    expect(haiku).toBeGreaterThan(0)
  })
})
