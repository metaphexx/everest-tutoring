import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'

export type AudienceKey = 'all' | 'year:8' | 'year:9' | 'year:10' | 'alumni' | 'waitlist'
export type BroadcastChannel = 'email' | 'sms' | 'both'

export function audienceLabel(key: string): string {
  if (key === 'alumni') return 'alumni (win-back)'
  if (key === 'waitlist') return 'waitlist families'
  if (key.startsWith('year:')) return `Year ${key.split(':')[1]} parents`
  return 'all current parents'
}

type Recipient = { id: string; name: string | null; email: string | null; phone: string | null; emailOptOut: boolean; smsOptOut: boolean }

export async function resolveAudience(key: string): Promise<Recipient[]> {
  // Win-back: former families only, and only those who haven't opted out of
  // marketing (separate from the transactional STOP flags, still honoured below).
  if (key === 'alumni') {
    return prisma.user.findMany({
      where: { role: 'parent', lifecycleStage: 'alumni', marketingOptOut: false },
      select: { id: true, name: true, email: true, phone: true, emailOptOut: true, smsOptOut: true },
    })
  }
  // Families currently on a waitlist (prospective demand to market to).
  if (key === 'waitlist') {
    const ws = await prisma.waitlist.findMany({ where: { status: { in: ['waiting', 'offered', 'claimed'] } }, select: { parentId: true } })
    const ids = [...new Set(ws.map((w) => w.parentId))]
    if (ids.length === 0) return []
    return prisma.user.findMany({ where: { id: { in: ids }, marketingOptOut: false }, select: { id: true, name: true, email: true, phone: true, emailOptOut: true, smsOptOut: true } })
  }
  // Regular broadcasts go to CURRENT parents only (never former customers).
  const parents = await prisma.user.findMany({
    where: { role: 'parent', lifecycleStage: 'active' },
    select: { id: true, name: true, email: true, phone: true, emailOptOut: true, smsOptOut: true, students: { select: { yearLevel: true } } },
  })
  if (key.startsWith('year:')) {
    const yr = Number(key.split(':')[1])
    return parents.filter((p) => p.students.some((s) => s.yearLevel === yr))
  }
  return parents
}

export type BroadcastResult = {
  audience: string
  channel: BroadcastChannel
  emails: number
  sms: number
  status: 'sent' | 'preview'
}

/**
 * Send an admin broadcast to a resolved audience, respecting opt-outs. Logs each
 * message to the Notification audit (type "broadcast"). Preview mode (no keys)
 * records without sending.
 */
export async function sendBroadcast(input: { audienceKey: string; channel: BroadcastChannel; subject: string; body: string }): Promise<BroadcastResult> {
  const recipients = await resolveAudience(input.audienceKey)
  const wantEmail = input.channel === 'email' || input.channel === 'both'
  const wantSms = input.channel === 'sms' || input.channel === 'both'
  let emails = 0
  let sms = 0

  for (const r of recipients) {
    if (wantEmail && r.email && !r.emailOptOut) {
      let status: string = 'preview'
      let error: string | null = null
      if (hasResend) {
        try { await sendEmail({ to: r.email, subject: input.subject, text: input.body }); status = 'sent' } catch (e) { status = 'failed'; error = e instanceof Error ? e.message : String(e) }
      }
      await prisma.notification.create({ data: { userId: r.id, channel: 'email', type: 'broadcast', recipient: r.email, subject: input.subject, body: input.body, status, error } })
      emails++
    }
    if (wantSms && r.phone && !r.smsOptOut) {
      let status: string = 'preview'
      let error: string | null = null
      const smsBody = `${input.body}\n- Everest Tutoring`
      if (hasTwilio) {
        try { await sendSMS(r.phone, smsBody); status = 'sent' } catch (e) { status = 'failed'; error = e instanceof Error ? e.message : String(e) }
      }
      await prisma.notification.create({ data: { userId: r.id, channel: 'sms', type: 'broadcast', recipient: r.phone, body: smsBody, status, error } })
      sms++
    }
  }

  return { audience: audienceLabel(input.audienceKey), channel: input.channel, emails, sms, status: hasResend || hasTwilio ? 'sent' : 'preview' }
}
