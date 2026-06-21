'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { sendBroadcast, type BroadcastChannel } from '@/lib/broadcast'
import { sendSeatOffer } from '@/lib/waitlist'

// Market to everyone currently on a waitlist (excludes marketing opt-outs;
// transactional STOP still honoured in sendBroadcast).
export async function sendWaitlistBlast(input: { channel: BroadcastChannel; subject: string; body: string }) {
  await requireUser(['admin'])
  if (!input.body.trim() || (input.channel !== 'sms' && !input.subject.trim())) return { ok: false, text: 'Add a subject and message first.' }
  const r = await sendBroadcast({ audienceKey: 'waitlist', channel: input.channel, subject: input.subject, body: input.body })
  const verb = r.status === 'sent' ? 'Sent' : 'Drafted (preview mode)'
  const bits: string[] = []
  if (r.emails) bits.push(`${r.emails} email${r.emails === 1 ? '' : 's'}`)
  if (r.sms) bits.push(`${r.sms} SMS`)
  revalidatePath('/admin/waitlist')
  return { ok: true, text: `${verb}: ${bits.join(' + ') || 'no reachable families'}. Logged in communications.` }
}

// Manually offer a seat to a waiting family from the consolidated view.
export async function offerSeat(waitlistId: string) {
  await requireUser(['admin'])
  const r = await sendSeatOffer(waitlistId)
  revalidatePath('/admin/waitlist')
  return r
}
