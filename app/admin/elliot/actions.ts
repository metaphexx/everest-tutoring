'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { elliotPropose, applyNote, type ChatTurn, type ElliotAction } from '@/lib/elliot'
import { sendBroadcast, type BroadcastChannel } from '@/lib/broadcast'

export async function askElliot(history: ChatTurn[]): Promise<{ text: string; action?: ElliotAction }> {
  await requireUser(['admin'])
  return elliotPropose(history.slice(-12))
}

export async function confirmBroadcast(input: { audienceKey: string; channel: BroadcastChannel; subject: string; body: string }) {
  await requireUser(['admin'])
  const r = await sendBroadcast(input)
  const verb = r.status === 'sent' ? 'Sent' : 'Drafted (preview mode)'
  const bits: string[] = []
  if (r.emails) bits.push(`${r.emails} email${r.emails === 1 ? '' : 's'}`)
  if (r.sms) bits.push(`${r.sms} SMS`)
  return { text: `${verb}: ${bits.join(' + ') || 'no reachable recipients'} to ${r.audience}. It's in the communications log.`, status: r.status }
}

export async function confirmNote(input: { studentId: string; body: string; category: string; studentName: string }) {
  const admin = await requireUser(['admin'])
  const r = await applyNote({ studentId: input.studentId, body: input.body, category: input.category, authorId: admin.id, authorName: admin.name ?? 'Admin' })
  if (!r.ok) return { text: `Sorry, I couldn't find that student to add the note.` }
  revalidatePath(`/admin/students/${input.studentId}`)
  return { text: `Saved a note on ${input.studentName}'s record. It's in their profile and the activity log, where you can undo it if needed.` }
}
