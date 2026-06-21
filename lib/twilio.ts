import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
)

export async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_PHONE_NUMBER) return
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body,
  })
}

export function buildConfirmationSMS(params: {
  parentName: string
  confirmationCode: string
  studentsCount: number
  weeksRemaining: number
  totalAmount: string
}): string {
  return `Hi ${params.parentName}! ✅ Your Everest Tutoring booking is confirmed.\n\nCode: ${params.confirmationCode}\nStudents: ${params.studentsCount} | Weeks: ${params.weeksRemaining} | Total: ${params.totalAmount}\n\nClasses @ Harrisdale SHS, 3:15pm–4:15pm.\n\nQuestions? everesttutoring.com.au`
}

export function buildReminderSMS(params: {
  parentName: string
  studentName: string
  subject: string
  day: string
  time: string
}): string {
  return `Hi ${params.parentName}! Reminder: ${params.studentName} has ${params.subject} tomorrow (${params.day} ${params.time}) at Harrisdale SHS. See you there! - Everest Tutoring`
}
