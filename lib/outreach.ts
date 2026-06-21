import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'
import { draftReferralOutreach } from '@/lib/elliot'

/**
 * Referral outreach delivery. Elliot drafts the message (lib/elliot.ts); the
 * admin reviews/edits it; this module sends it. Same safe pattern as the rest
 * of the comms layer: preview mode (no keys) composes + logs to the Notification
 * audit without actually sending.
 *
 * NOTE: referrals are the one exception to the "SMS only after a paid booking"
 * rule, so every outreach message carries an opt-out (AU Spam Act).
 */

const EMAIL_FOOTER =
  '\n\nYou are receiving this because Harrisdale SHS referred your child to Everest Tutoring. ' +
  'If you would prefer not to hear from us, reply with "unsubscribe" and we will remove your details.'
const SMS_FOOTER = ' Reply STOP to opt out.'

/** Generate (or regenerate) Elliot's outreach draft for a referral and store it. */
export async function generateReferralDraft(referralId: string) {
  const r = await prisma.referral.findUnique({ where: { id: referralId } })
  if (!r) return null
  const draft = await draftReferralOutreach({
    studentName: r.studentName,
    yearLevel: r.yearLevel,
    subject: r.subject,
    reason: r.reason,
    parentName: r.parentName,
  })
  await prisma.referral.update({
    where: { id: referralId },
    data: {
      outreachSubject: draft.subject,
      outreachEmail: draft.email,
      outreachSms: draft.sms,
      // Keep "sent" if it was already sent; otherwise mark as a ready draft.
      outreachStatus: r.outreachStatus === 'sent' ? 'sent' : 'drafted',
    },
  })
  return draft
}

export type OutreachResult = {
  emailSent: boolean
  smsSent: boolean
  status: 'sent' | 'preview'
  live: boolean
}

/**
 * Send the (possibly admin-edited) outreach email + SMS to the referred parent.
 * Appends compliance footers, logs each message to the audit (type "outreach"),
 * and advances the referral to "contacted".
 */
export async function sendReferralOutreach(input: {
  referralId: string
  subject: string
  email: string
  sms: string
}): Promise<OutreachResult> {
  const r = await prisma.referral.findUnique({ where: { id: input.referralId } })
  if (!r) throw new Error('Referral not found')

  const emailBody = input.email.trim() + EMAIL_FOOTER
  const smsBody = /stop/i.test(input.sms) ? input.sms.trim() : input.sms.trim() + SMS_FOOTER

  let emailSent = false
  let smsSent = false

  if (r.parentEmail) {
    let status = 'preview'
    let error: string | null = null
    if (hasResend) {
      try {
        await sendEmail({ to: r.parentEmail, subject: input.subject, text: emailBody })
        status = 'sent'
      } catch (e) {
        status = 'failed'
        error = e instanceof Error ? e.message : String(e)
      }
    }
    await prisma.notification.create({
      data: { channel: 'email', type: 'outreach', recipient: r.parentEmail, subject: input.subject, body: emailBody, status, error },
    })
    emailSent = true
  }

  if (r.parentPhone) {
    let status = 'preview'
    let error: string | null = null
    if (hasTwilio) {
      try {
        await sendSMS(r.parentPhone, smsBody)
        status = 'sent'
      } catch (e) {
        status = 'failed'
        error = e instanceof Error ? e.message : String(e)
      }
    }
    await prisma.notification.create({
      data: { channel: 'sms', type: 'outreach', recipient: r.parentPhone, body: smsBody, status, error },
    })
    smsSent = true
  }

  await prisma.referral.update({
    where: { id: input.referralId },
    data: {
      outreachSubject: input.subject,
      outreachEmail: input.email,
      outreachSms: input.sms,
      outreachStatus: 'sent',
      outreachSentAt: new Date(),
      status: r.status === 'new' ? 'contacted' : r.status,
    },
  })

  return { emailSent, smsSent, status: hasResend || hasTwilio ? 'sent' : 'preview', live: hasResend || hasTwilio }
}
