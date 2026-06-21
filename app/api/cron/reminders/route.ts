import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendClassReminders } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Daily reminder job. In production a scheduler (e.g. Vercel Cron) hits this each
// evening; protect it with CRON_SECRET. Sends reminders for tomorrow's classes.
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }
  const result = await sendClassReminders()
  return NextResponse.json(result)
}

export const GET = run
export const POST = run
