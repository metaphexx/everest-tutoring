import Link from 'next/link'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { HeartHandshake } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import RetentionControls from './RetentionControls'
import AtRiskList from './AtRiskList'
import { computeFamilyRisk } from '@/lib/retention-score'
import { Sparkles } from 'lucide-react'

export const metadata = { title: 'Retention - Admin' }
export const dynamic = 'force-dynamic'

const money = (c: number) => `$${(c / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`
const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  discussing: 'bg-sky-100 text-sky-700',
  retained: 'bg-green-100 text-green-700',
  processed: 'bg-slate-100 text-slate-500',
}

export default async function RetentionPage() {
  const requests = await prisma.withdrawalRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: {
      parent: {
        include: {
          students: { select: { status: true } },
          bookings: { where: { paymentStatus: { in: ['paid', 'disputed'] } }, select: { totalAmountCents: true, createdAt: true } },
        },
      },
    },
  })
  const risks = (await computeFamilyRisk()).slice(0, 12)
  const active = requests.filter((r) => r.status === 'requested' || r.status === 'discussing')
  const resolved = requests.filter((r) => r.status === 'retained' || r.status === 'processed').slice(0, 25)

  // Retention rate among resolved cases (saved vs left).
  const decided = requests.filter((r) => r.status === 'retained' || r.status === 'processed')
  const saved = decided.filter((r) => r.status === 'retained').length
  const retentionRate = decided.length ? Math.round((saved / decided.length) * 100) : null

  const valueOf = (p: (typeof requests)[number]['parent']) => {
    const ltv = p.bookings.reduce((s, b) => s + b.totalAmountCents, 0)
    const activeStudents = p.students.filter((s) => s.status === 'active').length
    const since = p.bookings.length ? p.bookings.reduce((a, b) => (b.createdAt < a ? b.createdAt : a), p.bookings[0].createdAt) : null
    return { ltv, activeStudents, since }
  }

  return (
    <AdminShell sub="Retention">
      <div className="flex items-center gap-2.5">
        <HeartHandshake size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Retention</h1>
      </div>
      <p className="portal-lede mt-1">
        Enrolment requests - changes, pauses, and families considering leaving. Reach out, help them, and try to keep them; only process a withdrawal once you&apos;ve talked.
        {retentionRate !== null && <> · <span className="font-semibold text-green-700">{retentionRate}% saved</span> of {decided.length} decided</>}
      </p>

      {/* AI-flagged at-risk families (computed from signals, no tokens until you draft) */}
      <section className="glass-card glass-card-pad mt-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-primary" />
          <h2 className="portal-section-title">At-risk families</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">Ranked by churn signals (attendance, payments, auto-enrolment, engagement). Draft a personalised win-back when you want one.</p>
        <AtRiskList families={risks} />
      </section>

      {active.length === 0 ? (
        <div className="glass-card glass-card-pad mt-5"><p className="text-sm text-slate-500">No open retention cases. 🎉</p></div>
      ) : (
        <div className="space-y-3 mt-5">
          {active.map((r) => {
            const v = valueOf(r.parent)
            return (
              <div key={r.id} className="glass-card glass-card-pad">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                      <p className="font-semibold text-dark">{r.studentName ?? r.parentName ?? 'A family'}</p>
                      <span className="text-xs text-slate-400">{r.studentId ? 'one student' : 'whole family'}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5">&ldquo;{r.reason}&rdquo;</p>
                    <p className="text-xs text-slate-400 mt-1">{r.parentName} · raised {format(r.createdAt, 'd MMM, h:mma')}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <p className="text-base font-bold text-dark">{money(v.ltv)}</p>
                    <p>lifetime value</p>
                    <p className="mt-1">{v.activeStudents} active student{v.activeStudents === 1 ? '' : 's'}</p>
                    {v.since && <p>since {format(v.since, 'MMM yyyy')}</p>}
                  </div>
                </div>
                <RetentionControls id={r.id} status={r.status} />
              </div>
            )
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="glass-card glass-card-pad mt-6">
          <h2 className="portal-section-title mb-3">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,.5)' }}>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                <span className="flex-1 min-w-0 truncate text-dark">{r.studentName ?? r.parentName ?? 'A family'}</span>
                {r.status === 'processed' && <Link href="/admin/alumni" className="text-xs font-medium text-primary">View in alumni →</Link>}
                <span className="text-xs text-slate-400">{r.resolvedAt ? format(r.resolvedAt, 'd MMM') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
