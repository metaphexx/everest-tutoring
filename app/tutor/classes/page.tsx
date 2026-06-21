import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Users, CalendarClock, MessageCircleQuestion } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { formatTime, dayLong, subjectColor } from '@/lib/student'
import PortalShell from '@/components/portal/PortalShell'

export const metadata: Metadata = { title: 'Classrooms · Tutor' }
export const dynamic = 'force-dynamic'

export default async function TutorClassroomsPage() {
  const user = await requireUser(['tutor'])
  const classFilter = user.role === 'admin' ? {} : { tutorId: user.id }

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, ...classFilter },
    include: {
      _count: { select: { enrollments: { where: { status: 'active' } } } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { yearLevel: 'asc' }],
  })

  // Per-class counts of questions waiting and recent stream activity.
  const ids = subjects.map((s) => s.id)
  const waitingByClass = new Map<string, number>()
  if (ids.length) {
    const grouped = await prisma.question.groupBy({
      by: ['classId'],
      where: { classId: { in: ids }, blocked: false, status: 'waiting_for_tutor' },
      _count: { _all: true },
    })
    for (const g of grouped) waitingByClass.set(g.classId, g._count._all)
  }

  return (
    <PortalShell eyebrow="Tutor" sub="Classrooms" user={user}>
      <Link href="/tutor" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4"><ArrowLeft size={15} /> Dashboard</Link>
      <div className="mb-5">
        <h1 className="portal-title">My classrooms</h1>
        <p className="portal-lede">Post announcements, answer questions and share resources with each class.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="glass-card glass-card-pad text-center"><p className="text-sm text-slate-500">You have no classes this term.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.map((s) => {
            const color = subjectColor(s.name)
            const waiting = waitingByClass.get(s.id) ?? 0
            return (
              <Link key={s.id} href={`/tutor/classes/${s.id}`} className="glass-card glass-card-pad block transition-transform hover:-translate-y-0.5" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Year {s.yearLevel}</p>
                  </div>
                  {waiting > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,.16)', color: '#B45309' }}>
                      <MessageCircleQuestion size={11} /> {waiting} waiting
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Users size={13} /> {s._count.enrollments} students</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> {dayLong(s.dayOfWeek)} {formatTime(s.startTime)}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3">Open classroom <ArrowRight size={13} /></span>
              </Link>
            )
          })}
        </div>
      )}
    </PortalShell>
  )
}
