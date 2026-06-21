'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { generateReferralDraft, sendReferralOutreach } from '@/lib/outreach'

// Re-run Elliot's draft for a referral (e.g. after the school adds more detail).
export async function regenerateOutreach(referralId: string) {
  await requireUser(['admin'])
  await generateReferralDraft(referralId)
  revalidatePath('/admin/partner')
  return { ok: true }
}

// Send the admin-approved (and possibly edited) outreach to the referred parent.
export async function sendOutreach(input: { referralId: string; subject: string; email: string; sms: string }) {
  await requireUser(['admin'])
  const result = await sendReferralOutreach(input)
  revalidatePath('/admin/partner')
  revalidatePath('/admin/communications')
  return result
}
