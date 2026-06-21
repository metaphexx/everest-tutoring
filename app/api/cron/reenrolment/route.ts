import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runAutoReenrolment } from '@/lib/reenrolment'

export const dynamic = 'force-dynamic'

// Term rollover job. Schedule (e.g. Vercel Cron) to hit ?mode=remind a week
// before term ends, then ?mode=charge in the last week. CRON_SECRET protected.
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 })
  }
  const mode = new URL(req.url).searchParams.get('mode') === 'remind' ? 'remind' : 'charge'
  const result = await runAutoReenrolment(mode)
  return NextResponse.json(result)
}

export const GET = run
export const POST = run
