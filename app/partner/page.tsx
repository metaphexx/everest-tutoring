import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { requireUser } from '@/lib/session'
import { format, startOfDay } from 'date-fns'
import { ShieldCheck, AlertTriangle, CalendarDays } from 'lucide-react'
import PortalShell from '@/components/portal/PortalShell'
import PartnerSubmit from './PartnerSubmit'
import AssessmentView from '@/app/admin/partner/AssessmentView'
import { getAttendanceTrend } from '@/lib/attendance-trend'
import AttendanceTrend from '@/components/charts/AttendanceTrend'

export const metadata = { title: 'HSHS Partner Portal' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default async function PartnerPage() {
  const user = await requireUser(['school'])

  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()

  // Read-only: only names, years, subjects, attendance. No parent contacts, no financials.
  const [subjects, attendance] = await Promise.all([
    prisma.subject.findMany({
      where: { term: { isActive: true } },
      include: {
        enrollments: {
          where: { status: 'active' },
          select: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { yearLevel: 'asc' }],
    }),
    prisma.attendance.findMany({
      select: { studentId: true, subjectId: true, status: true, student: { select: { firstName: true, lastName: true } } },
    }),
  ])

  const trend = await getAttendanceTrend()
  const [assessments, referralCount, noticeCount] = await Promise.all([
    prisma.assessmentDate.findMany({ where: { date: { gte: startOfDay(today) } }, orderBy: { date: 'asc' }, take: 10 }),
    prisma.referral.count(),
    prisma.schoolNotice.count(),
  ])

  // Distinct enrolled HSHS students
  const enrolledIds = new Set<string>()
  const byYear: Record<number, number> = {}
  for (const s of subjects) {
    for (const e of s.enrollments) {
      enrolledIds.add(e.student.id)
    }
  }
  for (const id of enrolledIds) {
    const yr = subjects.flatMap((s) => s.enrollments).find((e) => e.student.id === id)?.student.yearLevel
    if (yr) byYear[yr] = (byYear[yr] ?? 0) + 1
  }

  // Overall attendance rate
  const attTotal = attendance.length
  const attended = attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const overallPct = attTotal > 0 ? Math.round((attended / attTotal) * 100) : null

  // Per-class attendance rate
  const classRate = (subjectId: string) => {
    const recs = attendance.filter((a) => a.subjectId === subjectId)
    if (!recs.length) return null
    const ok = recs.filter((a) => a.status === 'present' || a.status === 'late').length
    return Math.round((ok / recs.length) * 100)
  }

  // Repeat-absence flags (>= 2 absences) - for the school's wellbeing follow-up
  const absentCounts = new Map<string, { name: string; n: number }>()
  for (const a of attendance) {
    if (a.status !== 'absent') continue
    const key = a.studentId
    const name = `${a.student.firstName} ${a.student.lastName}`
    absentCounts.set(key, { name, n: (absentCounts.get(key)?.n ?? 0) + 1 })
  }
  const repeatAbsentees = [...absentCounts.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n)

  const todayClasses = subjects.filter((s) => s.dayOfWeek === todayDow)
  const onCampusToday = todayClasses.flatMap((s) => s.enrollments.map((e) => ({ ...e.student, subject: s.name })))

  return (
    <PortalShell eyebrow="HSHS Partner" sub="Harrisdale Senior High School" user={{ name: user.name, role: 'school' }}>
      <div className="space-y-6">
        <section>
          <h1 className="portal-title">Everest at HSHS - overview</h1>
          <p className="portal-lede">A read-only view of the on-campus program. Attendance is shared for duty of care; no academic grades or financial details are shown.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="glass-stat">
              <div className="glass-stat-label">Students</div>
              <div className="glass-stat-value" style={{ color: '#009dff' }}>{enrolledIds.size}</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-label">Classes / week</div>
              <div className="glass-stat-value" style={{ color: '#7C3AED' }}>{subjects.length}</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-label">Attendance</div>
              <div className="glass-stat-value" style={{ color: '#16a34a' }}>{overallPct !== null ? `${overallPct}%` : '-'}</div>
            </div>
            <div className="glass-stat">
              <div className="glass-stat-label">On campus today</div>
              <div className="glass-stat-value" style={{ color: '#d97706' }}>{onCampusToday.length}</div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* On campus today - duty of care roster */}
          <div className="glass-card glass-card-pad lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={17} className="text-primary" />
              <h2 className="portal-section-title">On campus today · {format(today, 'EEE d MMM')}</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Students attending Everest classes on site after school today.</p>
            {onCampusToday.length === 0 ? (
              <p className="text-sm text-slate-500">No Everest classes on campus today.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {onCampusToday.map((st) => (
                  <span key={`${st.id}-${st.subject}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,.55)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: YEAR_COLORS[st.yearLevel] ?? '#009dff' }} />
                    {st.firstName} {st.lastName}
                    <span className="text-xs text-slate-400">Y{st.yearLevel} · {st.subject}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Participation by year */}
          <div className="glass-card glass-card-pad">
            <h2 className="portal-section-title mb-3">Participation by year</h2>
            <div className="space-y-2.5">
              {[8, 9, 10].map((yr) => (
                <div key={yr} className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: YEAR_COLORS[yr] }}>Y{yr}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((byYear[yr] ?? 0) / Math.max(1, enrolledIds.size)) * 100)}%`, background: YEAR_COLORS[yr] }} />
                  </div>
                  <span className="text-sm font-semibold text-dark w-6 text-right">{byYear[yr] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Repeat-absence flags */}
        {repeatAbsentees.length > 0 && (
          <div className="glass-card glass-card-pad">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={17} className="text-amber-600" />
              <h2 className="portal-section-title">Wellbeing - repeat absences</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Students with two or more absences this term, for your wellbeing team to follow up.</p>
            <div className="flex flex-wrap gap-2">
              {repeatAbsentees.map((x) => (
                <span key={x.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ background: 'rgba(217,119,6,.1)', color: '#92400e' }}>
                  {x.name}
                  <span className="px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: 'rgba(217,119,6,.2)' }}>{x.n} absences</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly schedule + attendance rates */}
        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">This week&apos;s classes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)' }}>
                  {['Day', 'Class', 'Year', 'Enrolled', 'Attendance'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const rate = classRate(s.id)
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                      <td className="py-3 pr-4 text-dark">{DAY_NAMES[s.dayOfWeek]} <span className="text-xs text-slate-400">{s.startTime}–{s.endTime}</span></td>
                      <td className="py-3 pr-4 font-semibold text-dark">{s.name}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: YEAR_COLORS[s.yearLevel] ?? '#009dff' }}>Y{s.yearLevel}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                        {s.enrollments.length} / {s.capacity}
                        {s.enrollments.length >= s.capacity
                          ? <Badge variant="danger" size="sm" className="ml-2">Full</Badge>
                          : <span className="ml-2 text-xs text-slate-400">{s.capacity - s.enrollments.length} left</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {rate === null ? <span className="text-slate-300 text-xs">-</span> : (
                          <span className="font-semibold" style={{ color: rate >= 85 ? '#16a34a' : rate >= 70 ? '#d97706' : '#dc2626' }}>{rate}%</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance trend */}
        <div className="glass-card glass-card-pad">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={17} className="text-primary" />
            <h2 className="portal-section-title">Attendance over the term</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">Each line is a year level; the dashed line is the average. Filter by subject and year.</p>
          <AttendanceTrend data={trend} />
        </div>

        {/* Two-way channel */}
        <PartnerSubmit />

        {assessments.length > 0 && (
          <div className="glass-card glass-card-pad">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={17} className="text-primary" />
              <h2 className="portal-section-title">Assessment calendar you&apos;ve shared</h2>
            </div>
            <AssessmentView assessments={assessments.map((a) => ({ id: a.id, date: a.date.toISOString(), yearLevel: a.yearLevel, subject: a.subject, title: a.title }))} />
            <p className="text-xs text-slate-400 mt-2">Everest tutors see these so lessons line up with what&apos;s coming.</p>
          </div>
        )}

        {(referralCount > 0 || noticeCount > 0) && (
          <p className="text-xs text-slate-400 text-center">{referralCount} referral{referralCount === 1 ? '' : 's'} · {noticeCount} notice{noticeCount === 1 ? '' : 's'} shared with Everest.</p>
        )}

        <p className="text-xs text-slate-400 text-center">
          Everest Tutoring × Harrisdale SHS partnership · Read-only access to program data; submissions above are shared with Everest.
        </p>
      </div>
    </PortalShell>
  )
}
