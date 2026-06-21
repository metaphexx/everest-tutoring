import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordInboundReply } from '@/lib/inbound'
import { captureError } from '@/lib/log'

export const dynamic = 'force-dynamic'

const emailOf = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase()
// Trim the quoted history off a reply so we store just the new text.
const stripQuote = (s: string) => s.split(/\n>|\nOn .+ wrote:|-----Original Message-----/)[0].trim()

// Inbound email replies. Point a Gmail "forward to webhook" rule (or Resend
// Inbound / a provider like SendGrid Inbound Parse) at POST /api/webhooks/email.
// Body is provider-specific JSON; we read the common fields.
// DEV: protect with INBOUND_EMAIL_SECRET (Bearer) and verify the provider's signature.
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.INBOUND_EMAIL_SECRET
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const data = (await req.json().catch(() => ({}))) as Record<string, string>
    const from = data.from ?? data.sender ?? data.From ?? ''
    const subject = data.subject ?? data.Subject
    const text = data.text ?? data.plain ?? data.body ?? data['stripped-text'] ?? ''
    const body = stripQuote(String(text))
    if (from && body) await recordInboundReply({ channel: 'email', from: emailOf(from), body, subject })
  } catch (e) {
    await captureError(e, { where: 'email.inbound' })
  }
  return NextResponse.json({ ok: true })
}
