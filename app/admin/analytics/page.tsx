import { TrendingUp, Users, DollarSign, UserCheck, Repeat } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { prisma } from '@/lib/db'
import { getAttendanceTrend } from '@/lib/attendance-trend'
import AttendanceTrend from '@/components/charts/AttendanceTrend'

export const metadata = { title: 'Analytics - Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function AnalyticsPage() {
  const trend = await getAttendanceTrend()
  const [students, attendance, subjects, paidAgg, referrals, enrolledStudents, activeBookings] = await Promise.all([
    prisma.student.count(),
    prisma.attendance.findMany({ select: { status: true, classDate: true } }),
    prisma.subject.findMany({ where: { term: { isActive: true } }, include: { _count: { select: { enrollments: true } } } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'paid' }, _sum: { totalAmountCents: true }, _count: true }),
    prisma.referral.findMany({ select: { status: true, studentName: true } }),
    prisma.student.findMany({ where: { enrollments: { some: { status: 'active' } } }, select: { firstName: true, lastName: true } }),
    // Current-term paid families + whether each is set to roll into next term.
    prisma.booking.findMany({ where: { paymentStatus: 'paid', term: { isActive: true } }, select: { userId: true, autoReenrol: true } }),
  ])

  // Re-enrolment to subsequent terms: how many current families are set to continue.
  const familyContinuing = new Map<string, boolean>()
  for (const b of activeBookings) familyContinuing.set(b.userId, (familyContinuing.get(b.userId) ?? false) || b.autoReenrol)
  const familiesThisTerm = familyContinuing.size
  const continuing = [...familyContinuing.values()].filter(Boolean).length
  const reenrolRate = familiesThisTerm ? Math.round((continuing / familiesThisTerm) * 100) : 0

  const attTotal = attendance.length
  const attended = attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const overallPct = attTotal ? Math.round((attended / attTotal) * 100) : null
  const revenue = (paidAgg._sum.totalAmountCents ?? 0) / 100

  // Referral funnel
  const enrolledNames = new Set(enrolledStudents.map((s) => `${s.firstName} ${s.lastName}`.toLowerCase().trim()))
  const converted = referrals.filter((r) => enrolledNames.has(r.studentName.toLowerCase().trim())).length
  const conversionRate = referrals.length ? Math.round((converted / referrals.length) * 100) : 0

  const totalSeats = subjects.reduce((n, s) => n + s.capacity, 0)
  const filledSeats = subjects.reduce((n, s) => n + s._count.enrollments, 0)
  const fillRate = totalSeats ? Math.round((filledSeats / totalSeats) * 100) : 0

  const stats = [
    { label: 'Students', value: students, color: '#009dff', Icon: Users },
    { label: 'Term attendance', value: overallPct !== null ? `${overallPct}%` : '-', color: '#16a34a', Icon: TrendingUp },
    { label: 'Revenue (paid)', value: `$${revenue.toFixed(0)}`, color: '#EC4899', Icon: DollarSign },
    { label: 'Referral conversion', value: `${conversionRate}%`, color: '#7C3AED', Icon: UserCheck },
    { label: 'Re-enrol rate', value: `${reenrolRate}%`, color: '#0EA5E9', Icon: Repeat },
  ]

  return (
    <AdminShell sub="Analytics">
      <h1 className="portal-title">Analytics</h1>
      <p className="portal-lede">How the program is tracking - attendance, capacity, revenue and conversion.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {stats.map((s) => (
          <div key={s.label} className="glass-stat">
            <div className="flex items-center gap-1.5"><s.Icon size={13} style={{ color: s.color }} /><div className="glass-stat-label">{s.label}</div></div>
            <div className="glass-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Re-enrolment to subsequent terms */}
      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="portal-section-title">Re-enrolment to next term</h2>
          <span className="text-sm font-bold" style={{ color: '#0EA5E9' }}>{reenrolRate}% continuing</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{continuing} of {familiesThisTerm} current famil{familiesThisTerm === 1 ? 'y is' : 'ies are'} set to auto-enrol into next term. The other {familiesThisTerm - continuing} have it off - worth a retention nudge before term ends.</p>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(15,42,79,.08)' }}>
          <div className="h-full rounded-full" style={{ width: `${reenrolRate}%`, background: 'linear-gradient(90deg,#0EA5E9,#009dff)' }} />
        </div>
      </div>

      {/* Attendance trend line chart */}
      <div className="glass-card glass-card-pad mt-5">
        <h2 className="portal-section-title mb-1">Attendance over the term</h2>
        <p className="text-xs text-slate-500 mb-3">Each line is a year level; the dashed line is the average. Filter by subject and year level.</p>
        <AttendanceTrend data={trend} />
      </div>

      <div className="mt-5">
        {/* Class fill rate */}
        <div className="glass-card glass-card-pad">
          <div className="flex items-center justify-between mb-1">
            <h2 className="portal-section-title">Class fill rate</h2>
            <span className="text-sm font-bold text-primary">{fillRate}% full</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">{filledSeats} of {totalSeats} seats taken across {subjects.length} classes.</p>
          <div className="space-y-2">
            {subjects.map((s) => {
              const pct = s.capacity ? Math.round((s._count.enrollments / s.capacity) * 100) : 0
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate" style={{ color: YEAR_COLORS[s.yearLevel] }}>Y{s.yearLevel} {s.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: YEAR_COLORS[s.yearLevel] ?? '#009dff' }} />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{s._count.enrollments}/{s.capacity}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Referral funnel */}
      <div className="glass-card glass-card-pad mt-5">
        <h2 className="portal-section-title mb-3">Referral funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Referred', value: referrals.length, color: '#009dff' },
            { label: 'Contacted', value: referrals.filter((r) => r.status === 'contacted' || r.status === 'enrolled').length, color: '#d97706' },
            { label: 'Enrolled', value: converted, color: '#16a34a' },
            { label: 'Conversion', value: `${conversionRate}%`, color: '#7C3AED' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,.5)' }}>
              <div className="font-display font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
