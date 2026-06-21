import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import RequestForm from './RequestForm'
import MissedSessions from './MissedSessions'
import { availableMakeupClasses } from '@/lib/makeup'

export const metadata = { title: 'Requests' }
export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = { makeup: 'Make-up', reschedule: 'Reschedule', cancel: 'Cancellation', other: 'Request' }
const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  scheduled: 'bg-green-100 text-green-700',
  resolved: 'bg-slate-100 text-slate-500',
  declined: 'bg-red-100 text-red-700',
}

export default async function RequestsPage() {
  const user = await requireUser(['parent'])
  const [me, students, requests] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
    prisma.student.findMany({
      where: { parentId: user.id },
      include: { enrollments: { where: { status: 'active' }, include: { subject: { select: { name: true } } } } },
      orderBy: { yearLevel: 'asc' },
    }),
    prisma.serviceRequest.findMany({ where: { parentId: user.id }, orderBy: { createdAt: 'desc' } }),
  ])

  const studentOptions = students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    subjects: [...new Set(s.enrollments.map((e) => e.subject.name))],
  }))
  const nameOf = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  // Missed sessions + make-up entitlements (parent-reported only).
  const missRows = await prisma.missedSession.findMany({ where: { parentId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 })
  const misses = await Promise.all(missRows.map(async (m) => ({
    id: m.id,
    studentName: nameOf.get(m.studentId) ?? 'Your child',
    missedSubject: m.missedSubject,
    missedDateLabel: m.missedDateLabel,
    status: m.status,
    makeupSubject: m.makeupSubject,
    makeupDateLabel: m.makeupDateLabel,
    available: m.status === 'open' ? await availableMakeupClasses(m.studentId) : [],
  })))

  return (
    <PortalShell eyebrow="Parent" sub="Requests" user={{ name: me?.name, role: 'parent' }}>
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <h1 className="portal-title">Missed a session?</h1>
      <p className="portal-lede">If you let us know your child can&apos;t make a class, you can book a make-up in another class the same term - or it becomes account credit toward next term.</p>

      <div className="mt-5">
        <MissedSessions students={studentOptions} misses={misses} />
      </div>

      <h2 className="portal-section-title mt-8 mb-1">Other requests</h2>
      <p className="text-sm text-slate-500 mb-4">Reschedules or any other enrolment change.</p>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass-card glass-card-pad">
          <RequestForm students={studentOptions} />
        </div>

        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Your requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing yet. Submitted requests show up here with their status.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-dark">{TYPE_LABEL[r.type] ?? 'Request'}</span>
                    {r.studentName && <span className="text-xs text-slate-500">· {r.studentName}</span>}
                    <Badge size="sm" className={`ml-auto capitalize ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-500'}`}>{r.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{r.details}</p>
                  {r.preferredDate && <p className="text-xs text-slate-400 mt-1">Preferred: {format(r.preferredDate, 'EEE d MMM')}</p>}
                  {r.adminNote && <p className="text-xs mt-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(0,157,255,.08)', color: '#1e293b' }}><span className="font-semibold">Everest:</span> {r.adminNote}</p>}
                  <p className="text-[11px] text-slate-300 mt-1">{format(r.createdAt, 'd MMM, h:mmaaa')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}
