import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateNudges } from '@/lib/nudges'
import { sweepExpiredOffers, sweepWaitlistReminders } from '@/lib/waitlist'
import { sweepMissedSessions } from '@/lib/makeup'
import { sweepAbandonedCheckouts } from '@/lib/abandoned'
import { lapseNonContinuingFamilies } from '@/lib/reenrolment'

export const dynamic = 'force-dynamic'

// Proactive-nudge scan. Schedule daily; also runs on each admin overview load.
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 })
  }
  // Reminders first (chase open offers/claims), then expire + roll any that lapsed.
  const reminders = await sweepWaitlistReminders()
  const [created, waitlist, makeups, carts, lapsed] = await Promise.all([
    generateNudges(), sweepExpiredOffers(), sweepMissedSessions(), sweepAbandonedCheckouts(),
    // Move families who didn't continue into the active term onto the win-back list.
    lapseNonContinuingFamilies(),
  ])
  return NextResponse.json({ created, waitlist, reminders, makeups, carts, lapsed })
}

export const GET = run
export const POST = run
