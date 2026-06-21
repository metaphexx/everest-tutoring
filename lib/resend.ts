import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation(params: {
  to: string
  parentName: string
  confirmationCode: string
  students: { name: string; subjects: string[]; day: string }[]
  totalAmount: string
  weeksRemaining: number
  termName: string
}) {
  const studentList = params.students
    .map(s => `<li><strong>${s.name}</strong>: ${s.subjects.join(', ')} (${s.day})</li>`)
    .join('')

  return resend.emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: params.to,
    subject: `Booking Confirmed - ${params.confirmationCode} | Everest Tutoring @ HSHS`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Montserrat', Arial, sans-serif; background: #f8fafb; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,32,63,0.08);">
          <div style="background: linear-gradient(135deg, #00203F 0%, #009dff 100%); padding: 40px 40px 32px;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Everest Tutoring × Harrisdale Senior High School</p>
          </div>
          <div style="padding: 40px;">
            <p style="color: #00203F; font-size: 16px;">Hi ${params.parentName},</p>
            <p style="color: #475569; line-height: 1.6;">Your booking is confirmed for <strong>${params.termName}</strong>. Classes start from next Monday at HSHS.</p>

            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #009dff;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #009dff; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Confirmation Code</p>
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #00203F; letter-spacing: 4px;">${params.confirmationCode}</p>
            </div>

            <h3 style="color: #00203F; margin: 24px 0 12px;">Enrolled Classes</h3>
            <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
              ${studentList}
            </ul>

            <div style="display: flex; justify-content: space-between; background: #f8fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <div>
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">Weeks remaining</p>
                <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #00203F;">${params.weeksRemaining}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">Total paid</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #009dff;">${params.totalAmount}</p>
              </div>
            </div>

            <p style="color: #475569; font-size: 14px; line-height: 1.6;">📍 <strong>Location:</strong> Harrisdale Senior High School, Harrisdale WA 6112<br>
            🕒 <strong>Time:</strong> 3:15pm – 4:15pm<br>
            📞 <strong>Questions?</strong> Reply to this email or DM us on Instagram</p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">Everest Tutoring × Harrisdale SHS Partnership<br>everesttutoring.com.au</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendReminderEmail(params: {
  to: string
  parentName: string
  studentName: string
  subject: string
  day: string
  time: string
}) {
  return resend.emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: params.to,
    subject: `Class Reminder: ${params.studentName}'s ${params.subject} tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f8fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,32,63,0.08);">
          <p style="color: #009dff; font-weight: 700; margin: 0 0 4px;">Everest Tutoring × HSHS</p>
          <h2 style="color: #00203F; margin: 0 0 16px;">Class Reminder 🎓</h2>
          <p style="color: #475569;">Hi ${params.parentName},</p>
          <p style="color: #475569;">Just a reminder that <strong>${params.studentName}</strong> has <strong>${params.subject}</strong> class tomorrow.</p>
          <div style="background: #f0f9ff; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>${params.day}</strong> at <strong>${params.time}</strong></p>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Harrisdale Senior High School</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">everesttutoring.com.au</p>
        </div>
      </body>
      </html>
    `,
  })
}

// Generic branded email (used for admin broadcasts / announcements).
export async function sendEmail(params: { to: string; subject: string; text: string }) {
  return resend.emails.send({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f8fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,32,63,0.08);">
          <p style="color: #009dff; font-weight: 700; margin: 0 0 14px;">Everest Tutoring × HSHS</p>
          <div style="color: #475569; line-height: 1.7; white-space: pre-wrap;">${params.text}</div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">everesttutoring.com.au</p>
        </div>
      </body>
      </html>
    `,
  })
}
