import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { ArrowLeft, Mail, Phone, NotebookPen } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import CancelSessionControl from './CancelSessionControl'
import SubstituteControl from './SubstituteControl'
import { offerWaitlistSeat } from '../actions'

export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const STATUS_COLOR: Record<string, string> = { present: '#16a34a', late: '#d97706', absent: '#dc2626', excused: '#64748b' }
const STATUS_LABEL: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' }

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      tutor: { select: { name: true, email: true } },
      enrollments: { where: { status: 'active' }, include: { student: { include: { parent: true } } } },
      attendance: { orderBy: { classDate: 'desc' } },
      lessonNotes: { orderBy: { classDate: 'desc' }, take: 4 },
    },
  })
  if (!subject) notFound()

  const waitlist = await prisma.waitlist.findMany({ where: { subjectId: id, status: { in: ['waiting', 'offered', 'claimed'] } }, orderBy: { createdAt: 'asc' } })
  const isFull = subject.enrollments.length >= subject.capacity
  const [tutors, subs] = await Promise.all([
    prisma.user.findMany({ where: { role: 'tutor' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.substitution.findMany({ where: { subjectId: id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  async function offer(formData: FormData) {
    'use server'
    await offerWaitlistSeat(String(formData.get('id')))
  }

  // Attendance per student
  type Rec = { present: number; total: number; recent: { status: string; date: Date }[] }
  const attByStudent = new Map<string, Rec>()
  for (const a of subject.attendance) {
    const r = attByStudent.get(a.studentId) ?? { present: 0, total: 0, recent: [] }
    r.total++
    if (a.status === 'present' || a.status === 'late') r.present++
    r.recent.push({ status: a.status, date: a.classDate })
    attByStudent.set(a.studentId, r)
  }

  const yc = YEAR_COLORS[subject.yearLevel] ?? '#009dff'

  return (
    <AdminShell sub={`Class · ${subject.name}`}>
      <Link href="/admin/classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mb-3">
        <ArrowLeft size={15} /> All classes
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: yc }}>Year {subject.yearLevel}</span>
        <h1 className="portal-title" style={{ margin: 0 }}>{subject.name}</h1>
      </div>
      <p className="portal-lede mt-1">
        {DAY_NAMES[subject.dayOfWeek]} · {subject.startTime}-{subject.endTime} · Tutor: {subject.tutor?.name ?? 'Unassigned'} · {subject.enrollments.length}/{subject.capacity} enrolled
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <CancelSessionControl subjectId={subject.id} />
        <SubstituteControl subjectId={subject.id} tutors={tutors} />
      </div>

      {subs.length > 0 && (
        <div className="glass-card glass-card-pad mt-4">
          <h2 className="portal-section-title mb-2">Recent substitutions</h2>
          <div className="space-y-1.5">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">{s.dateLabel}</span>
                <span className="text-dark font-medium">{s.substituteName}</span>
                {s.reason && <span className="text-slate-400 text-xs truncate">· {s.reason}</span>}
                <span className="ml-auto text-xs text-slate-400">{format(s.createdAt, 'd MMM')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isFull || waitlist.length > 0) && (
        <div className="glass-card glass-card-pad mt-4">
          <h2 className="portal-section-title mb-1">Waitlist {isFull && <Badge variant="warning" size="sm" className="align-middle">class full</Badge>}</h2>
          {waitlist.length === 0 ? (
            <p className="text-sm text-slate-500">No one waiting. Parents can join from their dashboard when the class is full.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {waitlist.map((w) => (
                <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: w.bookingId ? 'rgba(220,38,38,.06)' : 'rgba(255,255,255,.5)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">
                      {w.studentName ?? w.parentName ?? 'A family'}
                      {w.bookingId && <Badge variant="danger" size="sm" className="ml-2 align-middle">paid · owed a seat</Badge>}
                    </p>
                    <p className="text-xs text-slate-400">{w.parentName ?? ''}</p>
                  </div>
                  {w.status === 'claimed' ? (
                    <Badge variant="success" size="sm">claimed</Badge>
                  ) : w.status === 'offered' ? (
                    <Badge variant="info" size="sm">seat offered</Badge>
                  ) : (
                    <form action={offer}>
                      <input type="hidden" name="id" value={w.id} />
                      <button type="submit" className="text-xs font-semibold text-primary">Offer seat</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roster */}
      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Student', 'Parent / guardian', 'Contact', 'Attendance', 'Recent'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subject.enrollments.map((e) => {
                const st = e.student
                const rec = attByStudent.get(st.id)
                const pct = rec && rec.total > 0 ? Math.round((rec.present / rec.total) * 100) : null
                const recent = (rec?.recent ?? []).slice(0, 6).reverse()
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: yc }}>{st.firstName[0]}{st.lastName[0]}</span>
                        <div>
                          <p className="font-semibold text-dark">{st.firstName} {st.lastName}</p>
                          <p className="text-xs text-slate-400">Year {st.yearLevel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-dark">{st.parent.name ?? '-'}</td>
                    <td className="px-5 py-4">
                      {st.parent.email && (
                        <a href={`mailto:${st.parent.email}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary">
                          <Mail size={12} /> {st.parent.email}
                        </a>
                      )}
                      {st.parent.phone && (
                        <a href={`tel:${st.parent.phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary mt-0.5">
                          <Phone size={12} /> {st.parent.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {pct === null ? <span className="text-slate-300 text-xs">no data</span> : (
                        <span className="font-semibold" style={{ color: pct >= 85 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626' }}>{pct}%</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {recent.length === 0 && <span className="text-slate-300 text-xs">-</span>}
                        {recent.map((a, i) => (
                          <span key={i} title={`${STATUS_LABEL[a.status]} · ${format(a.date, 'd MMM')}`} className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[a.status] ?? '#cbd5e1' }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {subject.enrollments.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-300">No students enrolled in this class</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent lesson notes */}
      {subject.lessonNotes.length > 0 && (
        <div className="glass-card glass-card-pad mt-5">
          <h2 className="portal-section-title mb-3">Recent lesson notes</h2>
          <div className="space-y-3">
            {subject.lessonNotes.map((n) => (
              <div key={n.id} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,.5)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <NotebookPen size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-dark">{format(n.classDate, 'EEE d MMM')}</p>
                </div>
                <p className="text-sm text-slate-600">{n.summary}</p>
                {n.homework && <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Homework:</span> {n.homework}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
