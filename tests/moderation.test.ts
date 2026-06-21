import { describe, it, expect } from 'vitest'
import { moderateMessage } from '@/lib/moderation'

// Runs against the deterministic stub (no ANTHROPIC_API_KEY in test env).
describe('moderation (stub heuristics)', () => {
  it('flags poaching attempts', async () => {
    const r = await moderateMessage('Happy to tutor privately, just pay me directly and skip Everest.')
    expect(r.flagged).toBe(true)
    expect(r.category).toBe('poaching')
  })

  it('flags safeguarding concerns', async () => {
    const r = await moderateMessage('I feel unsafe at home and need help')
    expect(r.flagged).toBe(true)
    expect(r.category).toBe('safeguarding')
  })

  it('passes normal messages', async () => {
    const r = await moderateMessage('Thanks so much, see you Monday for maths!')
    expect(r.flagged).toBe(false)
  })
})
