import { prisma } from '@/lib/db'
import { aiEnabled, aiMessage, firstText, modelFor } from '@/lib/ai'
import { resolveAudience, audienceLabel, type BroadcastChannel } from '@/lib/broadcast'

/**
 * Elliot - the AI assistant embedded in the Everest CRM. Grounded entirely in
 * live CRM data. When ANTHROPIC_API_KEY is set, answers/overviews come from
 * Claude (model chosen by lib/ai.ts, env-swappable). Until then Elliot runs in
 * preview mode: still useful, answering from the data deterministically.
 */

const SYSTEM = `You are Elliot, the AI assistant built into Everest Tutoring's CRM (the Everest Tutoring x Harrisdale Senior High School after-school program).
You help the admin team run the operation: understanding attendance, enrolments, bookings, classes and communications.
Be concise, warm and practical. Use Australian English. Answer only from the CRM data provided to you; if something isn't in the data, say so.
You can draft emails, SMS and reports when asked, but you can never send anything yourself - always tell the admin you've prepared a draft for them to review and confirm.`

export type ElliotContext = {
  students: number
  classes: number
  attendancePct: number | null
  attendance: Record<string, number>
  repeatAbsentees: string[]
  remindersLogged: number
  paidBookings: number
  pendingBookings: number
  revenue: number
}

export async function gatherContext(): Promise<ElliotContext> {
  const [students, classes, att, notifReminders, paid, pending, revenueAgg, absentRows] = await Promise.all([
    prisma.student.count(),
    prisma.subject.count({ where: { term: { isActive: true } } }),
    prisma.attendance.groupBy({ by: ['status'], _count: true }),
    prisma.notification.count({ where: { type: 'reminder' } }),
    prisma.booking.count({ where: { paymentStatus: 'paid' } }),
    prisma.booking.count({ where: { paymentStatus: 'pending' } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'paid' }, _sum: { totalAmountCents: true } }),
    prisma.attendance.findMany({ where: { status: 'absent' }, select: { studentId: true, student: { select: { firstName: true, lastName: true } } } }),
  ])

  const attendance: Record<string, number> = {}
  let total = 0
  let ok = 0
  for (const a of att) {
    attendance[a.status] = a._count
    total += a._count
    if (a.status === 'present' || a.status === 'late') ok += a._count
  }

  const absCount = new Map<string, { name: string; n: number }>()
  for (const r of absentRows) {
    const name = `${r.student.firstName} ${r.student.lastName}`
    absCount.set(r.studentId, { name, n: (absCount.get(r.studentId)?.n ?? 0) + 1 })
  }
  const repeatAbsentees = [...absCount.values()].filter((x) => x.n >= 2).map((x) => `${x.name} (${x.n})`)

  return {
    students,
    classes,
    attendancePct: total > 0 ? Math.round((ok / total) * 100) : null,
    attendance,
    repeatAbsentees,
    remindersLogged: notifReminders,
    paidBookings: paid,
    pendingBookings: pending,
    revenue: (revenueAgg._sum.totalAmountCents ?? 0) / 100,
  }
}

function contextToText(c: ElliotContext): string {
  return [
    `Students enrolled: ${c.students}`,
    `Classes running this term: ${c.classes}`,
    `Term attendance: ${c.attendancePct === null ? 'no data yet' : c.attendancePct + '%'} (present ${c.attendance.present ?? 0}, late ${c.attendance.late ?? 0}, absent ${c.attendance.absent ?? 0}, excused ${c.attendance.excused ?? 0})`,
    `Repeat absentees (2+): ${c.repeatAbsentees.length ? c.repeatAbsentees.join(', ') : 'none'}`,
    `Reminders logged: ${c.remindersLogged}`,
    `Bookings: ${c.paidBookings} paid, ${c.pendingBookings} pending`,
    `Revenue (paid): $${c.revenue.toFixed(0)}`,
  ].join('\n')
}

/** Whether Elliot is running on a live model or in preview mode. */
export function elliotStatus() {
  return { live: aiEnabled, model: aiEnabled ? modelFor('copilot') : null }
}

/** A short, plain-English snapshot for the dashboard card. */
export async function elliotOverview(): Promise<{ text: string; live: boolean }> {
  const ctx = await gatherContext()
  if (!aiEnabled) {
    const parts: string[] = []
    parts.push(`${ctx.students} student${ctx.students === 1 ? '' : 's'} across ${ctx.classes} weekly classes.`)
    if (ctx.attendancePct !== null) parts.push(`Attendance is sitting at ${ctx.attendancePct}% this term.`)
    if (ctx.repeatAbsentees.length) parts.push(`Worth a look: ${ctx.repeatAbsentees.join(', ')} ${ctx.repeatAbsentees.length === 1 ? 'has' : 'have'} two or more absences.`)
    if (ctx.pendingBookings) parts.push(`${ctx.pendingBookings} booking${ctx.pendingBookings === 1 ? '' : 's'} still unpaid.`)
    parts.push(`${ctx.remindersLogged} reminder${ctx.remindersLogged === 1 ? '' : 's'} in the log.`)
    return { text: parts.join(' '), live: false }
  }
  const msg = await aiMessage({
    task: 'summary',
    system: SYSTEM,
    maxTokens: 400,
    messages: [{ role: 'user', content: `Give me a 2-3 sentence snapshot of how the program is tracking right now, highlighting anything that needs attention.\n\nCRM data:\n${contextToText(ctx)}` }],
  })
  return { text: firstText(msg) || 'No summary available.', live: true }
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/** Reply to a chat conversation with Elliot. */
export async function elliotReply(history: ChatTurn[]): Promise<string> {
  const ctx = await gatherContext()
  const last = [...history].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? ''

  if (!aiEnabled) {
    // Preview mode: answer from the data with light intent matching.
    let answer: string
    if (/(attend|present|absent|late)/.test(last)) {
      answer = ctx.attendancePct === null
        ? `No attendance has been recorded yet.`
        : `Attendance is ${ctx.attendancePct}% this term - present ${ctx.attendance.present ?? 0}, late ${ctx.attendance.late ?? 0}, absent ${ctx.attendance.absent ?? 0}.${ctx.repeatAbsentees.length ? ` ${ctx.repeatAbsentees.join(', ')} ${ctx.repeatAbsentees.length === 1 ? 'has' : 'have'} 2+ absences.` : ''}`
    } else if (/(flag|wellbeing|risk|concern)/.test(last)) {
      answer = ctx.repeatAbsentees.length ? `Flagged for repeat absences: ${ctx.repeatAbsentees.join(', ')}.` : `Nobody is flagged for repeat absences right now.`
    } else if (/(remind|sms|email|message|comm)/.test(last)) {
      answer = `There ${ctx.remindersLogged === 1 ? 'is' : 'are'} ${ctx.remindersLogged} reminder${ctx.remindersLogged === 1 ? '' : 's'} in the communications log. Once you connect a key I can also draft and queue messages for your confirmation.`
    } else if (/(student|enrol|book|revenue|paid|pending|money)/.test(last)) {
      answer = `${ctx.students} students enrolled across ${ctx.classes} classes. Bookings: ${ctx.paidBookings} paid, ${ctx.pendingBookings} pending. Revenue so far: $${ctx.revenue.toFixed(0)}.`
    } else {
      answer = `Here's where things stand: ${ctx.students} students, ${ctx.classes} classes, attendance ${ctx.attendancePct ?? '-'}%.${ctx.repeatAbsentees.length ? ` ${ctx.repeatAbsentees.join(', ')} flagged for absences.` : ''}`
    }
    return `${answer}\n\n(Preview mode - add an ANTHROPIC_API_KEY to switch me on for full reasoning, drafting and report generation.)`
  }

  const msg = await aiMessage({
    task: 'copilot',
    system: `${SYSTEM}\n\nCurrent CRM data:\n${contextToText(ctx)}`,
    maxTokens: 800,
    messages: history,
  })
  return firstText(msg) || 'Sorry, I could not generate a response.'
}

/** Draft a warm, parent-facing end-of-term report comment for one student/subject. */
export async function draftReportComment(input: {
  studentName: string
  subjectName: string
  attendancePct: number | null
  late: number
  absent: number
  notes: string[]
}): Promise<string> {
  if (aiEnabled) {
    try {
      const msg = await aiMessage({
        task: 'report',
        maxTokens: 300,
        system:
          'You write a short, warm, parent-facing end-of-term tutoring report comment (2-3 sentences). Australian English. Base it only on the data given. Encouraging but honest about attendance.',
        messages: [
          {
            role: 'user',
            content: `Student: ${input.studentName}\nSubject: ${input.subjectName}\nAttendance: ${input.attendancePct ?? 'n/a'}% (${input.late} late, ${input.absent} absent)\nRecent topics covered: ${input.notes.join('; ') || 'n/a'}`,
          },
        ],
      })
      return firstText(msg)
    } catch {
      // fall through
    }
  }
  const parts: string[] = []
  parts.push(`${input.studentName} attended ${input.attendancePct ?? 0}% of ${input.subjectName} classes this term${input.late ? ` and was late ${input.late} time${input.late === 1 ? '' : 's'}` : ''}.`)
  if ((input.absent ?? 0) > 2) parts.push('Building a more regular attendance habit will help momentum next term.')
  if (input.notes.length) parts.push(`Recent focus has been on ${input.notes[0].toLowerCase().replace(/\.$/, '')}.`)
  parts.push(`${input.studentName} has shown steady effort and we look forward to continuing next term.`)
  return parts.join(' ')
}

// ── Referral outreach: Elliot drafts a personalised email + SMS for a prospect ──

export type ReferralOutreach = { subject: string; email: string; sms: string }

const BOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://everesttutoring.com.au'}/book`

/**
 * Draft warm, personalised outreach to a parent whose child HSHS referred to us,
 * grounded in the school's note about how we can help. Live via Claude, with a
 * deterministic preview-mode fallback. The admin always reviews before sending.
 */
export async function draftReferralOutreach(input: {
  studentName: string
  yearLevel: number
  subject?: string | null
  reason: string
  parentName?: string | null
}): Promise<ReferralOutreach> {
  const firstName = (input.parentName?.trim() || 'there').split(' ')[0]
  const subjectBit = input.subject ? ` in ${input.subject}` : ''

  if (aiEnabled) {
    try {
      const msg = await aiMessage({
        task: 'copilot',
        maxTokens: 700,
        system:
          `You are Elliot, writing on behalf of Everest Tutoring, a small-group after-school tutoring program that runs on-site at Harrisdale Senior High School. ` +
          `Write genuine, warm outreach to a parent whose child was referred to us by the school. Australian English. ` +
          `Be caring and encouraging, never pushy or salesy. Reference specifically how we can help, based on the school's note. ` +
          `Invite them to book a class at ${BOOK_URL}. ` +
          `Return JSON: subject (a short email subject line), email (120-160 words, greet the parent by first name, sign off as "The Everest Tutoring team", no unsubscribe footer), sms (under 300 characters, friendly, include the booking link).`,
        jsonSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            subject: { type: 'string' },
            email: { type: 'string' },
            sms: { type: 'string' },
          },
          required: ['subject', 'email', 'sms'],
        },
        messages: [
          {
            role: 'user',
            content: `Parent first name: ${firstName}\nStudent: ${input.studentName} (Year ${input.yearLevel})\nSubject area: ${input.subject || 'general studies'}\nSchool's note on how we can help: ${input.reason}`,
          },
        ],
      })
      const parsed = JSON.parse(firstText(msg)) as ReferralOutreach
      if (parsed.subject && parsed.email && parsed.sms) return parsed
    } catch {
      // fall through to deterministic draft
    }
  }

  // Preview / fallback: still personalised from the referral itself.
  const reasonLine = input.reason.trim()
    ? `Based on what the school shared, we can focus on ${input.reason.trim().replace(/\.$/, '').toLowerCase()}.`
    : ''
  const subject = `Helping ${input.studentName} get ahead${subjectBit} with Everest Tutoring`
  const email =
    `Hi ${firstName},\n\n` +
    `${input.studentName} (Year ${input.yearLevel}) was referred to us by Harrisdale SHS, who felt some extra support${subjectBit} would really help. ${reasonLine}\n\n` +
    `Everest Tutoring runs small-group classes right after school at Harrisdale SHS, with specialist tutors who tailor each session to where your child needs the most help. We would love to help ${input.studentName} build confidence and momentum.\n\n` +
    `You can see class times and book here: ${BOOK_URL}\n\n` +
    `If now is not the right time, just let us know and we will not follow up.\n\n` +
    `Warm regards,\nThe Everest Tutoring team`
  const sms =
    `Hi ${firstName}, it's Everest Tutoring. Harrisdale SHS referred ${input.studentName} for after-school ${input.subject || 'tutoring'} support and we would love to help. See class times and book: ${BOOK_URL}`

  return { subject, email, sms }
}

// ── Action-taking: Elliot DRAFTS an action for the admin to confirm ──
// Two kinds today: a broadcast (email/SMS to an audience) and a student note.
// Both are only ever applied after the admin presses confirm, and every applied
// action is captured in the audit trail.

export type ElliotBroadcastAction = {
  kind: 'broadcast'
  channel: BroadcastChannel
  audienceKey: string
  audienceLabel: string
  subject: string
  body: string
  recipientCount: number
  recipientSample: string[]
}

export type ElliotNoteAction = {
  kind: 'note'
  studentId: string
  studentName: string
  category: string
  body: string
}

export type ElliotAction = ElliotBroadcastAction | ElliotNoteAction

// Find a student named in free text (first name, optionally with last name).
async function findStudentInText(text: string): Promise<{ id: string; firstName: string; lastName: string } | null> {
  const students = await prisma.student.findMany({ where: { status: 'active' }, select: { id: true, firstName: true, lastName: true } })
  const lower = ` ${text.toLowerCase()} `
  // Prefer a full-name match, then a unique first-name match.
  const full = students.find((s) => lower.includes(` ${s.firstName.toLowerCase()} ${s.lastName.toLowerCase()} `))
  if (full) return full
  const firstMatches = students.filter((s) => new RegExp(`\\b${s.firstName.toLowerCase()}\\b`).test(text.toLowerCase()))
  return firstMatches.length === 1 ? firstMatches[0] : null
}

function extractNoteBody(text: string, student: { firstName: string; lastName: string }): string {
  const m = text.match(/(?:that|saying|to say|:)\s+(.*)/i)
  let body = m ? m[1] : text
  // strip leading intent verbs and the student's name
  body = body
    .replace(/\b(add|make|log|record|jot( down)?|note|remember|please|can you|could you|a note|to)\b/gi, ' ')
    .replace(new RegExp(`\\b${student.firstName}\\b|\\b${student.lastName}\\b`, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!body) body = text.trim()
  return body.charAt(0).toUpperCase() + body.slice(1)
}

const NOTE_INTENT = /\b(note|log|record|jot|remember|make a note|add a note)\b/i

const SEND_INTENT = /\b(e-?mail|text|sms|message|notify|tell|send|remind|announce|broadcast|let)\b/i
const AUDIENCE_HINT = /\b(parent|year|y8|y9|y10|everyone|all|famil)\b/i

function parseStub(text: string): { channel: BroadcastChannel; audienceKey: string; subject: string; body: string } {
  const t = text.toLowerCase()
  let channel: BroadcastChannel = 'both'
  if (/\b(text|sms)\b/.test(t) && !/e-?mail/.test(t)) channel = 'sms'
  else if (/e-?mail/.test(t) && !/\b(text|sms)\b/.test(t)) channel = 'email'
  let audienceKey = 'all'
  const ym = t.match(/year ?(8|9|10)|y(8|9|10)\b/)
  if (ym) audienceKey = `year:${ym[1] ?? ym[2]}`
  let body = text
  const m = text.match(/(?:that|about|saying|to say|letting them know|:)\s+(.*)/i)
  if (m) body = m[1].trim()
  else body = text.replace(SEND_INTENT, '').replace(/\b(all|the|parents?|year ?\d+|y\d+|please|can you|could you|to)\b/gi, ' ').replace(/\s+/g, ' ').trim()
  if (!body) body = text
  body = body.charAt(0).toUpperCase() + body.slice(1)
  return { channel, audienceKey, subject: 'A message from Everest Tutoring', body }
}

export async function elliotPropose(history: ChatTurn[]): Promise<{ text: string; action?: ElliotAction }> {
  const last = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''

  // Note intent: "make a note on Emma that ..." - propose a student note to confirm.
  if (NOTE_INTENT.test(last) && !AUDIENCE_HINT.test(last)) {
    const student = await findStudentInText(last)
    if (student) {
      const body = extractNoteBody(last, student)
      if (body.length > 1) {
        const action: ElliotNoteAction = { kind: 'note', studentId: student.id, studentName: `${student.firstName} ${student.lastName}`, category: 'general', body }
        return { text: `I've drafted a note for ${student.firstName}. Review it and press Save to add it to their record - it will be logged in the activity trail. I won't save anything without your go-ahead.`, action }
      }
    }
  }

  const isSend = SEND_INTENT.test(last) && AUDIENCE_HINT.test(last)
  if (!isSend) return { text: await elliotReply(history) }

  let parsed: { channel: BroadcastChannel; audienceKey: string; subject: string; body: string }
  if (aiEnabled) {
    try {
      const msg = await aiMessage({
        task: 'copilot',
        maxTokens: 400,
        system:
          `${SYSTEM}\nThe admin wants to send a message to parents. Extract a broadcast from their instruction. ` +
          `audienceKey is one of: all, year:8, year:9, year:10. channel is email, sms or both. Write a warm, clear subject and body. Respond JSON only.`,
        jsonSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            channel: { type: 'string', enum: ['email', 'sms', 'both'] },
            audienceKey: { type: 'string', enum: ['all', 'year:8', 'year:9', 'year:10'] },
            subject: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['channel', 'audienceKey', 'subject', 'body'],
        },
        messages: [{ role: 'user', content: last }],
      })
      parsed = JSON.parse(firstText(msg))
    } catch {
      parsed = parseStub(last)
    }
  } else {
    parsed = parseStub(last)
  }

  const recipients = await resolveAudience(parsed.audienceKey)
  const wantEmail = parsed.channel !== 'sms'
  const wantSms = parsed.channel !== 'email'
  const reachable = recipients.filter((r) => (wantEmail && r.email && !r.emailOptOut) || (wantSms && r.phone && !r.smsOptOut))

  const action: ElliotAction = {
    kind: 'broadcast',
    channel: parsed.channel,
    audienceKey: parsed.audienceKey,
    audienceLabel: audienceLabel(parsed.audienceKey),
    subject: parsed.subject,
    body: parsed.body,
    recipientCount: reachable.length,
    recipientSample: reachable.slice(0, 4).map((r) => r.name ?? 'Parent'),
  }
  const text = `I've drafted a ${parsed.channel === 'both' ? 'message' : parsed.channel} to ${action.audienceLabel} (${action.recipientCount} recipient${action.recipientCount === 1 ? '' : 's'}). Review it below and press Send to confirm - I won't send anything without your go-ahead.`
  return { text, action }
}

/**
 * Apply a confirmed note action. Creates a staff note on the student; because it
 * goes through the audited prisma client it is recorded in the activity trail
 * (and is reversible from there), with the admin who confirmed it as the actor.
 */
export async function applyNote(input: { studentId: string; body: string; category?: string; authorId?: string | null; authorName?: string | null }): Promise<{ ok: boolean }> {
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { id: true } })
  if (!student) return { ok: false }
  await prisma.studentNote.create({
    data: {
      studentId: input.studentId,
      body: input.body,
      category: input.category ?? 'general',
      authorId: input.authorId ?? null,
      authorName: input.authorName ?? 'Elliot (confirmed by admin)',
    },
  })
  return { ok: true }
}
