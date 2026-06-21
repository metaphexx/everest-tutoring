'use server'

import { requireUser } from '@/lib/session'
import { draftWinBack } from '@/lib/ai-assist'

// Draft a win-back note for an at-risk family. Admin-only; the admin reviews and
// sends it themselves. Uses the cheap draft model tier.
export async function draftWinBackForFamily(input: { parentName: string; students: string[]; reasons: string[] }) {
  await requireUser(['admin'])
  const text = await draftWinBack(input)
  if (!text) return { ok: false, error: 'Could not generate a draft right now.' }
  return { ok: true, text }
}
