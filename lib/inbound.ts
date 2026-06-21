import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'
import { aiEnabled } from '@/lib/ai'
import { cachedText } from '@/lib/ai-cache'

export type InboundIntent = { category: 'reschedule' | 'billing' | 'complaint' | 'absence' | 'enrolment' | 'general'; urgency: 'low' | 'normal' | 'high'; summary: string }

// Always-on keyword pass so the admin gets a category even without an API key.
function keywordIntent(body: string): InboundIntent {
  const t = body.toLowerCase()
  let category: InboundIntent['category'] = 'general'
  if (/\b(reschedul|move|change|swap|different time|can'?t make|cant make)\b/.test(t)) category = 'reschedule'
  else if (/\b(invoice|payment|paid|charge|refund|bill|cost|price)\b/.test(t)) category = 'billing'
  else if (/\b(complain|unhappy|disappoint|terrible|awful|angry|refund)\b/.test(t)) category = 'complaint'
  else if (/\b(sick|absent|away|won'?t be|wont be|miss(ing)? class|holiday)\b/.test(t)) category = 'absence'
  else if (/\b(enrol|sign up|join|book|another subject|add)\b/.test(t)) category = 'enrolment'
  const urgency: InboundIntent['urgency'] = /\b(urgent|asap|today|now|immediately|complain|angry)\b/.test(t) ? 'high' : 'normal'
  return { category, urgency, summary: body.slice(0, 120) }
}

/**
 * Parse an inbound reply into a structured intent so the admin sees what it is at
 * a glance (a reschedule, a billing query, a complaint…) and how urgent it is.
 * Keyword classification runs always; when an API key is set, a cheap model
 * (support tier) refines the category and writes a one-line summary. Best-effort:
 * any failure falls back to the keyword result.
 */
export async function classifyInboundReply(body: string): Promise<InboundIntent> {
  const base = keywordIntent(body)
  if (!aiEnabled) return base
  try {
    const text = await cachedText({
      task: 'support',
      maxTokens: 200,
      jsonSchema: {
        type: 'object', additionalProperties: false,
        properties: {
          category: { type: 'string', enum: ['reschedule', 'billing', 'complaint', 'absence', 'enrolment', 'general'] },
          urgency: { type: 'string', enum: ['low', 'normal', 'high'] },
          summary: { type: 'string' },
        },
        required: ['category', 'urgency', 'summary'],
      },
      system: 'You triage inbound parent replies for a tutoring centre. Classify the message and write a one-line summary (Australian English, no em dashes). Return JSON only.',
      messages: [{ role: 'user', content: body.slice(0, 600) }],
    })
    const parsed = JSON.parse(text) as InboundIntent
    return { category: parsed.category ?? base.category, urgency: parsed.urgency ?? base.urgency, summary: parsed.summary || base.summary }
  } catch {
    return base
  }
}

const INTENT_LABEL: Record<InboundIntent['category'], string> = {
  reschedule: 'Reschedule', billing: 'Billing', complaint: 'Complaint', absence: 'Absence', enrolment: 'Enrolment', general: 'Reply',
}

/**
 * Inbound replies. When a parent replies to an Everest email or texts back the
 * Twilio number, the provider POSTs to our webhook (app/api/webhooks/twilio,
 * app/api/webhooks/email) which calls this. We match the sender to a parent,
 * thread the reply into their support conversation, and alert the admin.
 *
 * See DEV_NOTES.md "Inbound replies" for wiring Twilio + Gmail/Resend inbound.
 */

// SMS opt-out keywords (carrier convention) - matched as the whole message.
const SMS_STOP = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|optout|opt-out)\s*$/i
const SMS_START = /^\s*(start|unstop|yes|subscribe)\s*$/i
// Email opt-out - the word can appear anywhere in the reply body.
const EMAIL_STOP = /\bunsubscribe\b/i

type Channel = 'sms' | 'email'

export async function recordInboundReply(input: {
  channel: Channel
  from: string
  body: string
  subject?: string
}) {
  const body = input.body.trim()
  if (!body) return { matched: false }

  const user = await prisma.user.findFirst({
    where: input.channel === 'sms' ? { phone: input.from } : { email: input.from },
    select: { id: true, name: true },
  })

  // Honour opt-out / opt-in BEFORE threading, so we never re-contact someone who
  // asked us to stop (Spam Act 2003). Referral SMS promises "Reply STOP".
  const isStop = input.channel === 'sms' ? SMS_STOP.test(body) : EMAIL_STOP.test(body)
  const isStart = input.channel === 'sms' && SMS_START.test(body)
  if (isStop || isStart) {
    const optedOut = isStop
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: input.channel === 'sms' ? { smsOptOut: optedOut } : { emailOptOut: optedOut },
      })
    }
    await prisma.notification.create({
      data: { userId: user?.id ?? null, channel: input.channel, type: 'inbound', recipient: input.from, subject: input.subject, body, status: optedOut ? 'opt-out' : 'opt-in' },
    })
    await notifyAdmin({
      type: 'system',
      title: `${input.channel.toUpperCase()} ${optedOut ? 'opt-out' : 'opt-in'}: ${user?.name ?? input.from}`,
      body: optedOut
        ? `Suppressed future ${input.channel} to ${input.from}.${user ? '' : ' No account on file - suppress in any external list too.'}`
        : `Re-subscribed ${input.from} to ${input.channel}.`,
      href: '/admin/communications',
      refKey: `optout:${input.channel}:${input.from}:${Date.now()}`,
    })
    return { matched: !!user, optOut: optedOut, optIn: isStart }
  }

  // Classify the reply so the admin sees what it is and how urgent at a glance.
  const intent = await classifyInboundReply(body)
  const tag = `[${INTENT_LABEL[intent.category]}${intent.urgency === 'high' ? ' · urgent' : ''}]`

  if (user) {
    // Thread into the parent's open support conversation (or start one).
    let conv = await prisma.conversation.findFirst({
      where: { type: 'support', parentId: user.id, status: 'open' },
      orderBy: { lastMessageAt: 'desc' },
    })
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { type: 'support', parentId: user.id, topic: input.subject || `Reply via ${input.channel}` },
      })
    }
    await prisma.message.create({ data: { conversationId: conv.id, senderId: user.id, body } })
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } })
    await notifyAdmin({
      type: 'support',
      title: `${tag} ${input.channel.toUpperCase()} reply from ${user.name ?? input.from}`,
      body: intent.summary,
      href: '/admin/messages',
      refKey: `inbound:${conv.id}:${Date.now()}`,
    })
  } else {
    // Unknown sender (e.g. a referred parent without an account yet).
    await notifyAdmin({
      type: 'support',
      title: `${tag} ${input.channel.toUpperCase()} reply from ${input.from}`,
      body: intent.summary,
      href: '/admin/messages',
    })
  }

  await prisma.notification.create({
    data: { userId: user?.id ?? null, channel: input.channel, type: 'inbound', recipient: input.from, subject: input.subject, body, status: 'received' },
  })
  return { matched: !!user }
}
