import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { familyCreditCents } from '@/lib/credits'
import { format } from 'date-fns'
import { FileText, NotebookPen } from 'lucide-react'
import PortalShell from '@/components/portal/PortalShell'
import NotifPrefs from './NotifPrefs'
import QuickActions from './QuickActions'
import JoinWaitlistButton from './JoinWaitlistButton'
import ClaimSeatButton from './ClaimSeatButton'
import ManageEnrollment from './ManageEnrollment'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  present: '#16a34a',
  late: '#d97706',
  absent: '#dc2626',
  excused: '#64748b',
}
const STATUS_LABEL: Record<string, string> = {
  present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused',
}
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function ParentDashboard() {
  const sessionUser = await requireUser(['parent'])

  const [me, students, booking] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, email: true, phone: true, emailOptOut: true, smsOptOut: true },
    }),
    prisma.student.findMany({
      where: { parentId: sessionUser.id },
      include: {
        // Current-term classes only. A child auto-enrolled for next term also has
        // active enrollments in that term; those shouldn't show as duplicate
        // subjects on the "this term" view (next term is surfaced separately).
        enrollments: { where: { status: 'active', subject: { term: { isActive: true } } }, include: { subject: true } },
        attendance: { orderBy: { classDate: 'desc' }, include: { subject: { select: { name: true } } } },
      },
      orderBy: { yearLevel: 'asc' },
    }),
    prisma.booking.findFirst({
      where: { userId: sessionUser.id, paymentStatus: 'paid' },
      orderBy: { createdAt: 'desc' },
      include: { term: true },
    }),
  ])

  const subjectIds = students.flatMap((s) => s.enrollments.map((e) => e.subjectId))
  const [notes, reports] = await Promise.all([
    subjectIds.length
      ? prisma.lessonNote.findMany({
          where: { subjectId: { in: subjectIds } },
          orderBy: { classDate: 'desc' },
          include: { subject: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.report.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, published: true },
      include: { subject: { select: { name: true } }, term: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Invoices/receipts + upcoming assessments for the "what's on" view.
  const subjectNames = [...new Set(students.flatMap((s) => s.enrollments.map((e) => e.subject.name)))]
  const [allBookings, assessments] = await Promise.all([
    prisma.booking.findMany({ where: { userId: sessionUser.id }, include: { term: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
    subjectNames.length
      ? prisma.assessmentDate.findMany({ where: { subject: { in: subjectNames }, date: { gte: new Date() } }, orderBy: { date: 'asc' } })
      : Promise.resolve([]),
  ])

  // Full classes at the children's year levels they could waitlist for.
  const childYears = [...new Set(students.map((s) => s.yearLevel))]
  const fullClasses = childYears.length
    ? (await prisma.subject.findMany({
        where: { term: { isActive: true }, yearLevel: { in: childYears } },
        include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
      })).filter((s) => s._count.enrollments >= s.capacity)
    : []
  const waitlistOptions = fullClasses.flatMap((s) => {
    const child = students.find((st) => st.yearLevel === s.yearLevel && !st.enrollments.some((e) => e.subjectId === s.id))
    return child ? [{ subject: s, child }] : []
  })

  // Seats this family has been offered and can claim now.
  const offeredSeats = await prisma.waitlist.findMany({
    where: { parentId: sessionUser.id, status: 'offered' },
    include: { subject: { select: { name: true, yearLevel: true, color: true } } },
    orderBy: { offeredAt: 'asc' },
  })

  const creditCents = await familyCreditCents(sessionUser.id)

  // Per-student derived data
  const childData = students.map((s) => {
    const total = s.attendance.length
    const attended = s.attendance.filter((a) => a.status === 'present' || a.status === 'late').length
    const pct = total > 0 ? Math.round((attended / total) * 100) : null
    const recent = s.attendance.slice(0, 8)
    const mysubjectIds = new Set(s.enrollments.map((e) => e.subjectId))
    const latestNote = notes.find((n) => mysubjectIds.has(n.subjectId))
    return { student: s, pct, total, recent, latestNote }
  })

  const totalClasses = students.reduce((n, s) => n + s.enrollments.length, 0)
  const overallPct = (() => {
    const all = students.flatMap((s) => s.attendance)
    if (!all.length) return null
    const ok = all.filter((a) => a.status === 'present' || a.status === 'late').length
    return Math.round((ok / all.length) * 100)
  })()
  const firstName = me?.name?.split(' ')[0] ?? 'there'

  return (
    <PortalShell eyebrow="Parent" sub={booking?.term.name ?? 'Everest Tutoring'} user={{ name: me?.name, role: 'parent' }}>
      <div className="space-y-7">
        {/* Greeting + headline stats */}
        <section>
          <h1 className="portal-title">Welcome back, {firstName}.</h1>
          <p className="portal-lede">Here&apos;s how your {students.length === 1 ? 'child is' : 'children are'} tracking this term.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            <div className="glass-stat">
              <div className="glass-stat-label">{students.length === 1 ? 'Child' : 'Children'}</div>
              <div className="glass-stat-value" style={{ color: '#009dff' }}>{students.length}</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-label">Classes / week</div>
              <div className="glass-stat-value" style={{ color: '#7C3AED' }}>{totalClasses}</div>
            </div>
            <div className="glass-stat col-span-2 sm:col-span-1">
              <div className="glass-stat-label">Attendance</div>
              <div className="glass-stat-value" style={{ color: '#16a34a' }}>{overallPct !== null ? `${overallPct}%` : '-'}</div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Children */}
          <div className="lg:col-span-2 space-y-5">
            {childData.length === 0 && (
              <div className="glass-card glass-card-pad text-center">
                <p className="text-slate-500 mb-4">No students enrolled yet.</p>
                <Link href="/book" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)' }}>
                  Enrol now
                </Link>
              </div>
            )}

            {childData.map(({ student, pct, total, recent, latestNote }) => (
              <div key={student.id} className="glass-card glass-card-pad">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold" style={{ background: student.enrollments[0]?.subject.color ?? '#009dff' }}>
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-dark leading-tight">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-slate-500">Year {student.yearLevel}</p>
                  </div>
                  {pct !== null && (
                    <div className="text-right">
                      <p className="font-display font-bold text-lg leading-none" style={{ color: pct >= 85 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626' }}>{pct}%</p>
                      <p className="text-[11px] text-slate-400">attendance</p>
                    </div>
                  )}
                </div>

                {/* subjects */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {student.enrollments.map((e) => (
                    <span key={e.id} className="px-3 py-1 rounded-full text-xs font-semibold text-white tracking-tight" style={{ background: e.subject.color, fontFamily: 'var(--font-display)' }}>
                      {e.subject.name}
                    </span>
                  ))}
                  {student.enrollments.length === 0 && <span className="text-xs text-slate-400">No active classes</span>}
                </div>

                {/* recent attendance dots */}
                {total > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-slate-500">Recent:</span>
                    <div className="flex gap-1.5">
                      {recent.slice().reverse().map((a) => (
                        <span
                          key={a.id}
                          title={`${a.subject.name} · ${format(a.classDate, 'd MMM')} · ${STATUS_LABEL[a.status]}`}
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ background: STATUS_COLOR[a.status] ?? '#cbd5e1' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* latest lesson note */}
                {latestNote && (
                  <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.7)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <NotebookPen size={13} className="text-primary" />
                      <p className="text-xs font-semibold text-dark">{latestNote.subject.name} · {format(latestNote.classDate, 'EEE d MMM')}</p>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{latestNote.summary}</p>
                    {latestNote.homework && (
                      <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold">Homework:</span> {latestNote.homework}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* What's on this week */}
            {childData.length > 0 && (
              <div className="glass-card glass-card-pad">
                <h2 className="portal-section-title mb-1">This week</h2>
                <p className="text-xs text-slate-500 mb-3">Your {students.length === 1 ? "child's" : "children's"} classes and what to bring.</p>
                <div className="space-y-3">
                  {childData.map(({ student, latestNote }) => {
                    const classes = student.enrollments
                    const nextA = assessments.find((a) => a.yearLevel === student.yearLevel && classes.some((e) => e.subject.name === a.subject))
                    return (
                      <div key={student.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.5)' }}>
                        <p className="text-sm font-semibold text-dark mb-2">{student.firstName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {classes.map((e) => (
                            <span key={e.id} className="text-xs px-2.5 py-1 rounded-lg font-semibold tracking-tight" style={{ background: `${e.subject.color}1a`, color: e.subject.color, fontFamily: 'var(--font-display)' }}>
                              {DAY_NAMES[e.subject.dayOfWeek]} {e.subject.startTime} · {e.subject.name}
                            </span>
                          ))}
                          {classes.length === 0 && <span className="text-xs text-slate-400">No classes this week</span>}
                        </div>
                        {latestNote?.summary && <p className="text-xs text-slate-500 mt-2"><span className="font-semibold text-slate-600">Notes:</span> {latestNote.summary}</p>}
                        {nextA && <p className="text-xs mt-1" style={{ color: '#b45309' }}><span className="font-semibold">Coming up:</span> {nextA.subject} {nextA.title} ({format(nextA.date, 'EEE d MMM')})</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {offeredSeats.length > 0 && (
              <div className="glass-card glass-card-pad" style={{ borderColor: 'rgba(34,197,94,.4)' }}>
                <h2 className="portal-section-title mb-1">A seat opened up 🎉</h2>
                <p className="text-xs text-slate-500 mb-3">Claim within 48 hours and we&apos;ll secure the spot for your child.</p>
                <div className="space-y-2">
                  {offeredSeats.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,.08)' }}>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white tracking-tight" style={{ background: w.subject.color, fontFamily: 'var(--font-display)' }}>Y{w.subject.yearLevel}</span>
                      <span className="flex-1 min-w-0 text-sm text-dark truncate">{w.subject.name}{w.studentName ? ` - for ${w.studentName}` : ''}</span>
                      <ClaimSeatButton waitlistId={w.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitlistOptions.length > 0 && (
              <div className="glass-card glass-card-pad">
                <h2 className="portal-section-title mb-1">Waitlist</h2>
                <p className="text-xs text-slate-500 mb-3">These classes are full. Join the waitlist and we&apos;ll offer a spot the moment one opens up.</p>
                <div className="space-y-2">
                  {waitlistOptions.map(({ subject, child }) => (
                    <div key={subject.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white tracking-tight" style={{ background: subject.color, fontFamily: 'var(--font-display)' }}>Y{subject.yearLevel}</span>
                      <span className="flex-1 min-w-0 text-sm text-dark truncate">{subject.name} - for {child.firstName}</span>
                      <JoinWaitlistButton subjectId={subject.id} studentId={child.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reports */}
            <div className="glass-card glass-card-pad">
              <h2 className="portal-section-title mb-3">Term reports</h2>
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500">End-of-term reports will appear here once your tutors publish them.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => {
                    const student = students.find((s) => s.id === r.studentId)
                    return (
                      <div key={r.id} className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,.55)' }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText size={16} className="text-primary flex-shrink-0" />
                          <p className="text-sm font-semibold text-dark">{student?.firstName} · {r.subject?.name ?? 'Overall'}</p>
                          {r.effort && <Badge variant="success" size="sm">{r.effort}</Badge>}
                          <span className="ml-auto text-xs text-slate-400">{r.term.name}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
                        {r.attendancePct !== null && <p className="text-xs text-slate-400 mt-1">Attendance: {r.attendancePct}%</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Manage enrolment - retention-first contact point (no self-service unenrol) */}
            <div className="glass-card glass-card-pad">
              <ManageEnrollment students={students.filter((s) => s.status === 'active').map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }))} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {booking && (
              <div className="glass-card glass-card-pad">
                <h3 className="portal-section-title mb-3">Current booking</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Confirmation</dt><dd className="font-mono font-bold text-dark">{booking.confirmationCode}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Term</dt><dd className="text-dark">{booking.term.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Weeks left</dt><dd className="font-semibold text-primary">{booking.weeksRemaining}</dd></div>
                  <div className="h-px" style={{ background: 'rgba(15,42,79,.08)' }} />
                  <div className="flex justify-between font-semibold"><dt className="text-slate-700">Total paid</dt><dd className="text-primary">${(booking.totalAmountCents / 100).toFixed(2)}</dd></div>
                </dl>
              </div>
            )}

            {creditCents > 0 && (
              <div className="glass-card glass-card-pad" style={{ borderColor: 'rgba(34,197,94,.35)' }}>
                <h3 className="portal-section-title mb-1">Account credit</h3>
                <p className="text-2xl font-bold text-green-700">${(creditCents / 100).toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">Automatically applied to your next charge.</p>
              </div>
            )}

            <div className="glass-card glass-card-pad">
              <h3 className="portal-section-title mb-3">Notifications</h3>
              <NotifPrefs initialEmailOptOut={me?.emailOptOut ?? false} initialSmsOptOut={me?.smsOptOut ?? false} />
            </div>

            {allBookings.length > 0 && (
              <div className="glass-card glass-card-pad">
                <h3 className="portal-section-title mb-3">Invoices &amp; receipts</h3>
                <div className="space-y-2.5">
                  {allBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark truncate">{b.term.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {b.xeroInvoiceNumber ? `Invoice ${b.xeroInvoiceNumber}` : (b.confirmationCode ?? '-')}
                        </p>
                      </div>
                      <span className="font-semibold text-dark">${(b.totalAmountCents / 100).toFixed(2)}</span>
                      <Badge variant={b.paymentStatus === 'paid' ? 'success' : 'warning'} size="sm">{b.paymentStatus}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <QuickActions autoReenrol={booking?.autoReenrol ?? false} hasBooking={!!booking} />
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
