import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { ArrowLeft, Mail, Phone, FileText, NotebookPen } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import StudentNotes from './StudentNotes'
import CreditPanel from './CreditPanel'
import ChangeEmail from './ChangeEmail'
import RecordHistory from '@/components/admin/RecordHistory'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const STATUS_COLOR: Record<string, string> = { present: '#16a34a', late: '#d97706', absent: '#dc2626', excused: '#64748b' }
const money = (c: number) => `$${(c / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      parent: { include: { bookings: { where: { paymentStatus: { in: ['paid', 'disputed'] } }, select: { totalAmountCents: true, createdAt: true, autoReenrol: true } } } },
      enrollments: { include: { subject: { select: { name: true, yearLevel: true } }, booking: { select: { createdAt: true, term: { select: { name: true, isActive: true } } } } }, orderBy: { createdAt: 'desc' } },
      attendance: { orderBy: { classDate: 'desc' } },
      reports: { include: { subject: { select: { name: true } }, term: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      notes: { orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] },
      credits: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!student) notFound()

  const creditBalance = student.credits.filter((c) => c.status === 'active').reduce((s, c) => s + c.amountCents, 0)
  const creditList = student.credits.map((c) => ({ id: c.id, amountCents: c.amountCents, originalCents: c.originalCents, reason: c.reason, status: c.status, createdAt: c.createdAt.toISOString() }))

  const ltv = student.parent.bookings.reduce((s, b) => s + b.totalAmountCents, 0)
  const since = student.parent.bookings.length ? student.parent.bookings.reduce((a, b) => (b.createdAt < a ? b.createdAt : a), student.parent.bookings[0].createdAt) : student.createdAt
  const total = student.attendance.length
  const attended = student.attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const pct = total > 0 ? Math.round((attended / total) * 100) : null
  const terms = [...new Set(student.enrollments.map((e) => e.booking?.term?.name).filter(Boolean))] as string[]
  const yc = YEAR_COLORS[student.yearLevel] ?? '#009dff'
  const isAlumni = student.parent.lifecycleStage === 'alumni'

  // Re-enrolment status for subsequent terms.
  const futureEnrol = student.enrollments.find((e) => e.booking?.term && !e.booking.term.isActive && e.booking.term.name)
  const autoReenrolOn = student.parent.bookings.some((b) => b.autoReenrol)
  const reenrol = student.status !== 'active'
    ? null
    : futureEnrol
      ? { label: `Enrolled for ${futureEnrol.booking!.term!.name}`, cls: 'bg-green-100 text-green-700' }
      : autoReenrolOn
        ? { label: 'Auto-enrol on - continuing next term', cls: 'bg-sky-100 text-sky-700' }
        : { label: 'Not re-enrolling next term', cls: 'bg-amber-100 text-amber-700' }

  const notes = student.notes.map((n) => ({ id: n.id, category: n.category, body: n.body, pinned: n.pinned, authorName: n.authorName, createdAt: n.createdAt.toISOString() }))

  return (
    <AdminShell sub={`Student · ${student.firstName} ${student.lastName}`}>
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mb-3">
        <ArrowLeft size={15} /> All students
      </Link>

      {/* Header */}
      <div className="glass-card glass-card-pad">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: yc }}>{student.firstName[0]}{student.lastName[0]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="portal-title" style={{ margin: 0 }}>{student.firstName} {student.lastName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: yc }}>Year {student.yearLevel}</span>
              <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>{student.status === 'active' ? 'Active' : 'Withdrawn'}</Badge>
              {isAlumni && <Link href="/admin/alumni" className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700">Alumni family</Link>}
              {reenrol && <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${reenrol.cls}`}>{reenrol.label}</span>}
            </div>
            <p className="text-sm text-slate-500 mt-1">{student.parent.name}</p>
            <div className="flex flex-wrap gap-3 mt-1">
              {student.parent.email && <a href={`mailto:${student.parent.email}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary"><Mail size={12} /> {student.parent.email}</a>}
              {student.parent.phone && <a href={`tel:${student.parent.phone}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary"><Phone size={12} /> {student.parent.phone}</a>}
            </div>
            <div className="mt-1"><ChangeEmail parentId={student.parentId} currentEmail={student.parent.email} /></div>
            {student.status === 'withdrawn' && student.exitReason && <p className="text-xs text-slate-400 mt-1.5">Left{student.withdrawnAt ? ` ${format(student.withdrawnAt, 'MMM yyyy')}` : ''}: &ldquo;{student.exitReason}&rdquo;</p>}
          </div>
          <div className="flex gap-5 shrink-0">
            <div className="text-center"><p className="text-xl font-bold text-dark">{money(ltv)}</p><p className="text-[11px] text-slate-400 uppercase tracking-wide">Family value</p></div>
            <div className="text-center"><p className="text-xl font-bold text-dark">{pct === null ? '-' : `${pct}%`}</p><p className="text-[11px] text-slate-400 uppercase tracking-wide">Attendance</p></div>
            <div className="text-center"><p className="text-xl font-bold text-dark">{terms.length}</p><p className="text-[11px] text-slate-400 uppercase tracking-wide">Terms</p></div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">With Everest since {format(since, 'MMMM yyyy')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        {/* Enrolment history */}
        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Enrolment history</h2>
          {student.enrollments.length === 0 ? <p className="text-sm text-slate-400">No enrolments on record.</p> : (
            <div className="space-y-2">
              {student.enrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>{e.subject.name}</span>
                  <span className="text-xs text-slate-400">{e.booking?.term?.name ?? ''}</span>
                  <Badge size="sm" variant={e.status === 'active' ? 'success' : 'neutral'} className="ml-auto">{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Attendance ({attended}/{total})</h2>
          {total === 0 ? <p className="text-sm text-slate-400">No attendance recorded yet.</p> : (
            <div className="flex flex-wrap gap-1.5">
              {student.attendance.slice(0, 40).reverse().map((a) => (
                <span key={a.id} title={`${a.status} · ${format(a.classDate, 'd MMM')}`} className="w-3.5 h-3.5 rounded-full" style={{ background: STATUS_COLOR[a.status] ?? '#cbd5e1' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reports */}
      {student.reports.length > 0 && (
        <div className="glass-card glass-card-pad mt-5">
          <h2 className="portal-section-title mb-3">Reports</h2>
          <div className="space-y-2">
            {student.reports.map((r) => (
              <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-dark">{r.subject?.name ?? 'Overall'}</p>
                  <span className="ml-auto text-xs text-slate-400">{r.term.name}</span>
                </div>
                <p className="text-sm text-slate-600">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff notes / documentation */}
      <div className="glass-card glass-card-pad mt-5">
        <CreditPanel studentId={student.id} balanceCents={creditBalance} credits={creditList} defaultDollars={35} />
      </div>

      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center gap-2 mb-3">
          <NotebookPen size={16} className="text-primary" />
          <h2 className="portal-section-title" style={{ margin: 0 }}>Notes &amp; documentation</h2>
        </div>
        <StudentNotes studentId={student.id} notes={notes} />
      </div>

      <RecordHistory
        entity="Student"
        entityId={student.id}
        related={[
          { entity: 'StudentNote', ids: student.notes.map((n) => n.id) },
          { entity: 'StudentCredit', ids: student.credits.map((c) => c.id) },
          { entity: 'Report', ids: student.reports.map((r) => r.id) },
        ]}
        childLabel={{ StudentNote: 'note', StudentCredit: 'credit', Report: 'report' }}
      />
    </AdminShell>
  )
}
