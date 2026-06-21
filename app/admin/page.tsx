import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Mail, MessageSquare, Sparkles, ArrowRight } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { elliotOverview } from '@/lib/elliot'
import { generateNudges } from '@/lib/nudges'
import { latestDigest, buildMorningBrief } from '@/lib/digest'

export const metadata = { title: 'Admin CRM' }
export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  present: '#16a34a', late: '#d97706', absent: '#dc2626', excused: '#64748b',
}

export default async function AdminPage() {
  // Refresh Elliot's proactive nudges (deduped per day) so the bell stays current.
  await generateNudges()

  const [bookings, students, enrollments, revenue, attendance, notifications] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true, term: true, enrollments: { include: { subject: true, student: true } } },
    }),
    prisma.student.findMany({ include: { parent: true, enrollments: { include: { subject: true } } } }),
    prisma.enrollment.findMany({ include: { subject: true, student: true } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'paid' }, _sum: { totalAmountCents: true }, _count: true }),
    prisma.attendance.groupBy({ by: ['status'], _count: true }),
    prisma.notification.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
  ])

  const totalRevenue = (revenue._sum.totalAmountCents ?? 0) / 100
  const paidCount = revenue._count

  const subjectCounts = enrollments.reduce<Record<string, number>>((acc, e) => {
    const key = `Y${e.subject.yearLevel} ${e.subject.name}`
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const attTotal = attendance.reduce((n, a) => n + a._count, 0)
  const attBy = (s: string) => attendance.find((a) => a.status === s)?._count ?? 0
  const attendedPct = attTotal > 0 ? Math.round(((attBy('present') + attBy('late')) / attTotal) * 100) : null

  const elliot = await elliotOverview()

  // The proactive morning brief. The nightly cron refreshes it; if none has been
  // generated today (e.g. in dev, before the cron runs) build one on the fly.
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  let brief = await latestDigest()
  if (!brief || brief.createdAt < startOfToday) { await buildMorningBrief().catch(() => {}); brief = await latestDigest() }

  return (
    <AdminShell sub="Term 3 2026 · Harrisdale SHS">
      <h1 className="portal-title">Overview</h1>
      <p className="portal-lede">A snapshot of bookings, attendance and communications.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {[
          { label: 'Total bookings', value: bookings.length, color: '#009dff' },
          { label: 'Paid bookings', value: paidCount, color: '#16a34a' },
          { label: 'Students', value: students.length, color: '#7C3AED' },
          { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, color: '#EC4899' },
        ].map((s) => (
          <div key={s.label} className="glass-stat">
            <div className="glass-stat-label">{s.label}</div>
            <div className="glass-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Proactive morning brief */}
      {brief && (
        <div className="glass-card glass-card-pad mt-5" style={{ background: 'linear-gradient(135deg, rgba(255,214,102,.18), rgba(0,157,255,.12))', border: '1px solid rgba(0,157,255,.22)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">🌅</span>
            <p className="font-display font-bold text-dark" style={{ margin: 0 }}>Morning brief</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: brief.live ? 'rgba(22,163,74,.15)' : 'rgba(255,255,255,.7)', color: brief.live ? '#16a34a' : '#475569' }}>{brief.live ? 'AI' : 'auto'}</span>
            <span className="ml-auto text-[11px] text-slate-400">{format(brief.createdAt, 'd MMM, h:mma')}</span>
          </div>
          <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{brief.body}</div>
        </div>
      )}

      {/* Elliot AI overview */}
      <Link href="/admin/elliot" className="glass-card glass-card-pad is-interactive block mt-5" style={{ background: 'linear-gradient(135deg, rgba(0,157,255,.16), rgba(124,92,255,.18))', border: '1px solid rgba(124,92,255,.28)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)', boxShadow: '0 4px 12px -3px rgba(124,92,255,.6)' }}>
            <Sparkles size={19} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display font-bold text-dark">Elliot</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: elliot.live ? 'rgba(22,163,74,.15)' : 'rgba(255,255,255,.7)', color: elliot.live ? '#16a34a' : '#475569' }}>
                {elliot.live ? 'live' : 'preview'}
              </span>
            </div>
            <p className="text-sm leading-relaxed mt-2 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,.82)', color: '#1e293b' }}>{elliot.text}</p>
            <p className="text-sm font-semibold text-primary mt-2.5 inline-flex items-center gap-1">Chat with Elliot <ArrowRight size={14} /></p>
          </div>
        </div>
      </Link>

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        {/* Attendance overview */}
        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Attendance this term</h2>
          {attTotal === 0 ? (
            <p className="text-sm text-slate-500">No attendance recorded yet.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="font-display font-bold text-3xl" style={{ color: attendedPct! >= 85 ? '#16a34a' : attendedPct! >= 70 ? '#d97706' : '#dc2626' }}>{attendedPct}%</span>
                <span className="text-xs text-slate-500 mb-1.5">attended ({attTotal} marks)</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
                {(['present', 'late', 'absent', 'excused'] as const).map((s) =>
                  attBy(s) > 0 ? <div key={s} style={{ width: `${(attBy(s) / attTotal) * 100}%`, background: STATUS_COLOR[s] }} /> : null,
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['present', 'late', 'absent', 'excused'] as const).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                    <span className="text-slate-600 capitalize">{s}</span>
                    <span className="text-slate-400 ml-auto">{attBy(s)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Class enrolments */}
        <div className="glass-card glass-card-pad lg:col-span-2">
          <h2 className="portal-section-title mb-3">Class enrolments</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {Object.entries(subjectCounts).map(([key, count]) => (
              <div key={key} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.5)' }}>
                <p className="font-semibold text-dark text-sm">{key}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (count / 12) * 100)}%`, background: count >= 10 ? '#EC4899' : count >= 8 ? '#F59E0B' : '#22C55E' }} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{count}/12</span>
                </div>
              </div>
            ))}
            {Object.keys(subjectCounts).length === 0 && <p className="text-sm text-slate-400">No active enrolments.</p>}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="portal-section-title">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-primary">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)' }}>
                {['Code', 'Parent', 'Students', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 8).map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                  <td className="py-3 pr-4 font-mono text-xs font-bold text-dark">{b.confirmationCode ?? '-'}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-dark">{b.user?.name}</p>
                    <p className="text-xs text-slate-400">{b.user?.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{b.studentsCount}</td>
                  <td className="py-3 pr-4 font-semibold text-dark">${(b.totalAmountCents / 100).toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={b.paymentStatus === 'paid' ? 'success' : 'warning'}>{b.paymentStatus}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{format(new Date(b.createdAt), 'dd MMM HH:mm')}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-300 text-sm">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communications preview */}
      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="portal-section-title">Recent communications</h2>
          <Link href="/admin/communications" className="text-sm font-medium text-primary">View all</Link>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No messages sent yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,157,255,.1)', color: '#009dff' }}>
                  {n.channel === 'email' ? <Mail size={15} /> : <MessageSquare size={15} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark truncate">{n.subject ?? n.body}</p>
                  <p className="text-xs text-slate-400">{n.type} · {n.recipient}</p>
                </div>
                <Badge size="sm" variant={n.status === 'sent' ? 'success' : n.status === 'failed' ? 'danger' : 'neutral'}>{n.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
