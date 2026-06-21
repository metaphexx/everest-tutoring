'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendBroadcast, type BroadcastChannel } from '@/lib/broadcast'

// Send a win-back campaign to the alumni segment (excludes marketing opt-outs;
// transactional STOP flags are still honoured inside sendBroadcast). Preview
// until live keys are set, like every other comms path.
export async function sendWinback(input: { channel: BroadcastChannel; subject: string; body: string }) {
  await requireUser(['admin'])
  if (!input.subject.trim() || !input.body.trim()) return { ok: false, text: 'Add a subject and message first.' }
  const r = await sendBroadcast({ audienceKey: 'alumni', channel: input.channel, subject: input.subject, body: input.body })
  const verb = r.status === 'sent' ? 'Sent' : 'Drafted (preview mode)'
  const bits: string[] = []
  if (r.emails) bits.push(`${r.emails} email${r.emails === 1 ? '' : 's'}`)
  if (r.sms) bits.push(`${r.sms} SMS`)
  revalidatePath('/admin/alumni')
  return { ok: true, text: `${verb}: ${bits.join(' + ') || 'no reachable alumni'}. Logged in communications.`, status: r.status }
}

// Respect a former family's request not to receive win-back marketing.
export async function setMarketingOptOut(parentId: string, value: boolean) {
  await requireUser(['admin'])
  await prisma.user.update({ where: { id: parentId }, data: { marketingOptOut: value } })
  revalidatePath('/admin/alumni')
  return { ok: true, value }
}
