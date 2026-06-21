import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordInboundReply } from '@/lib/inbound'
import { captureError } from '@/lib/log'

export const dynamic = 'force-dynamic'

// Inbound SMS from Twilio. Point your Twilio number's "A message comes in"
// webhook at POST /api/webhooks/twilio. A parent texting back your number lands
// here and threads into their support conversation.
// DEV: in production validate the X-Twilio-Signature header against the auth token.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const from = String(form.get('From') ?? '')
    const body = String(form.get('Body') ?? '')
    if (from && body) await recordInboundReply({ channel: 'sms', from, body })
  } catch (e) {
    await captureError(e, { where: 'twilio.inbound' })
  }
  // Empty TwiML = received, no auto-reply.
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}
