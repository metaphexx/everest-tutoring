import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { activeTermInfo } from '@/lib/term'

export const dynamic = 'force-dynamic'

// Live class availability for the booking funnel + landing page. Keyed as
// `${yearLevel}|${subjectName}` (e.g. "9|English"): `seats` = real spots left
// (capacity − active enrolments, floored at 0), `full` = the ones at capacity,
// plus the active term's dates. Always reflects actual bookings, never a static
// number, so seats-remaining is consistent everywhere it's shown.
export async function GET() {
  const [subjects, term] = await Promise.all([
    prisma.subject.findMany({
      where: { term: { isActive: true } },
      include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
    }),
    activeTermInfo(),
  ])
  const seats: Record<string, number> = {}
  const capacity: Record<string, number> = {}
  for (const s of subjects) {
    const key = `${s.yearLevel}|${s.name}`
    seats[key] = Math.max(0, s.capacity - s._count.enrollments)
    capacity[key] = s.capacity
  }
  const full = subjects.filter((s) => s._count.enrollments >= s.capacity).map((s) => `${s.yearLevel}|${s.name}`)
  return NextResponse.json({ full, seats, capacity, term })
}
