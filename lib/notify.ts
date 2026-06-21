import { addDays, format } from 'date-fns'
import { prisma } from '@/lib/db'
import { sendReminderEmail } from '@/lib/resend'
import { sendSMS, buildReminderSMS } from '@/lib/twilio'
import { inQuietHours } from '@/lib/comms'

// A value is a "real" credential only if present, non-placeholder, and (optionally)
// correctly prefixed. Until real keys are added, everything runs in preview mode:
// messages are composed and logged to Notification but never actually sent.
const real = (v: string | undefined, prefix?: string) =>
  !!v && !v.includes('...') && (!prefix || v.startsWith(prefix))

export const hasResend = real(process.env.RESEND_API_KEY, 're_')
export const hasTwilio =
  real(process.env.TWILIO_ACCOUNT_SID, 'AC') &&
  real(process.env.TWILIO_AUTH_TOKEN) &&
  real(process.env.TWILIO_PHONE_NUMBER, '+') &&
  !(process.env.TWILIO_PHONE_NUMBER ?? '').includes('12345678')

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CLASS_TIME = '3:15pm'

type DispatchInput = {
  userId?: string
  channel: 'email' | 'sms'
  type: string
  recipient: string
  subject?: string
  body: string
  refKey?: string
  live: boolean
  send: () => Promise<unknown>
}

// Records every message to the Notification audit log. Dedupes on refKey so a
// re-run never double-sends. When `live` is false, status is "preview".
async function dispatch(input: DispatchInput): Promise<'sent' | 'failed' | 'preview' | 'skipped'> {
  if (input.refKey) {
    const existing = await prisma.notification.findUnique({ where: { refKey: input.refKey } })
    if (existing) return 'skipped'
  }
  let status: 'sent' | 'failed' | 'preview' = 'preview'
  let error: string | null = null
  if (input.live) {
    try {
      await input.send()
      status = 'sent'
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
    }
  }
  await prisma.notification.create({
    data: {
      userId: input.userId,
      channel: input.channel,
      type: input.type,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      status,
      refKey: input.refKey,
      error,
    },
  })
  return status
}

export type ReminderResult = {
  date: string
  classes: number
  sent: number
  preview: number
  skipped: number
  failed: number
  live: { email: boolean; sms: boolean }
}

/**
 * Daily class reminders. Only parents with a PAID booking are reminded (the
 * "after they've booked their first class" rule), respecting per-channel opt-outs.
 * Defaults to tomorrow's classes - intended to run once each evening via cron.
 */
export async function sendClassReminders(forDate: Date = addDays(new Date(), 1)): Promise<ReminderResult> {
  const dow = forDate.getDay() === 0 ? 7 : forDate.getDay()
  const dateStr = format(forDate, 'yyyy-MM-dd')
  const dayName = DAY_NAMES[dow]

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, dayOfWeek: dow },
    include: {
      enrollments: {
        where: { status: 'active', booking: { paymentStatus: 'paid' } },
        include: { student: { include: { parent: true } } },
      },
    },
  })

  const tally = { sent: 0, preview: 0, skipped: 0, failed: 0 }
  const bump = (s: 'sent' | 'failed' | 'preview' | 'skipped') => { tally[s]++ }

  for (const s of subjects) {
    for (const e of s.enrollments) {
      const parent = e.student.parent
      const childName = e.student.firstName

      if (parent.email && !parent.emailOptOut) {
        bump(await dispatch({
          userId: parent.id,
          channel: 'email',
          type: 'reminder',
          recipient: parent.email,
          subject: `Class reminder: ${childName}'s ${s.name} tomorrow`,
          body: `${childName} has ${s.name} on ${dayName} at ${CLASS_TIME}, Harrisdale SHS.`,
          refKey: `reminder:${s.id}:${dateStr}:${e.studentId}:email`,
          live: hasResend,
          send: () => sendReminderEmail({
            to: parent.email!,
            parentName: parent.name ?? 'there',
            studentName: childName,
            subject: s.name,
            day: dayName,
            time: CLASS_TIME,
          }),
        }))
      }

      if (parent.phone && !parent.smsOptOut && !inQuietHours()) {
        const body = buildReminderSMS({
          parentName: parent.name ?? 'there',
          studentName: childName,
          subject: s.name,
          day: dayName,
          time: CLASS_TIME,
        })
        bump(await dispatch({
          userId: parent.id,
          channel: 'sms',
          type: 'reminder',
          recipient: parent.phone,
          body,
          refKey: `reminder:${s.id}:${dateStr}:${e.studentId}:sms`,
          live: hasTwilio,
          send: () => sendSMS(parent.phone!, body),
        }))
      }
    }
  }

  return {
    date: dateStr,
    classes: subjects.length,
    ...tally,
    live: { email: hasResend, sms: hasTwilio },
  }
}

/**
 * Fired when a tutor marks a student absent - lets the parent know their child
 * didn't attend. Deduped per student/class/day so re-marking won't re-alert.
 */
export async function sendAbsenceAlert(input: { studentId: string; subjectId: string; classDate: Date }) {
  const [student, subject] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId }, include: { parent: true } }),
    prisma.subject.findUnique({ where: { id: input.subjectId } }),
  ])
  if (!student || !subject) return
  const parent = student.parent
  const dateStr = format(input.classDate, 'yyyy-MM-dd')
  const niceDate = format(input.classDate, 'EEEE d MMM')
  const childName = student.firstName

  if (parent.email && !parent.emailOptOut) {
    await dispatch({
      userId: parent.id,
      channel: 'email',
      type: 'absence',
      recipient: parent.email,
      subject: `${childName} was marked absent from ${subject.name}`,
      body: `Hi ${parent.name ?? 'there'}, ${childName} was marked absent from ${subject.name} on ${niceDate}. If this is unexpected, please get in touch.`,
      refKey: `absence:${subject.id}:${dateStr}:${student.id}:email`,
      live: hasResend,
      send: () => sendReminderEmail({
        to: parent.email!,
        parentName: parent.name ?? 'there',
        studentName: childName,
        subject: `${subject.name} (absence)`,
        day: niceDate,
        time: CLASS_TIME,
      }),
    })
  }

  if (parent.phone && !parent.smsOptOut) {
    const body = `Hi ${parent.name ?? 'there'}, ${childName} was marked absent from ${subject.name} (${niceDate}) at Harrisdale SHS. Reply if this is unexpected. - Everest Tutoring`
    await dispatch({
      userId: parent.id,
      channel: 'sms',
      type: 'absence',
      recipient: parent.phone,
      body,
      refKey: `absence:${subject.id}:${dateStr}:${student.id}:sms`,
      live: hasTwilio,
      send: () => sendSMS(parent.phone!, body),
    })
  }
}
