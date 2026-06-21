import { FileText } from 'lucide-react'
import { prisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'
import PublishButton from './PublishButton'
import AutoDraftButton from './AutoDraftButton'
import { EmptyState } from '@/components/ui/card'

export const metadata = { title: 'Reports · Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      student: { select: { firstName: true, lastName: true, yearLevel: true } },
      subject: { select: { name: true } },
      term: { select: { name: true } },
      author: { select: { name: true } },
    },
  })

  const published = reports.filter((r) => r.published).length

  return (
    <AdminShell sub="Reports">
      <h1 className="portal-title">Reports</h1>
      <p className="portal-lede">Review end-of-term reports and publish them to parents. {published} of {reports.length} published. Tutors write their own, or auto-draft a first pass from attendance, lesson notes and questions for every student - then edit and publish.</p>

      <div className="mt-3"><AutoDraftButton /></div>

      {reports.length === 0 ? (
        <div className="glass-card mt-5">
          <EmptyState icon={<FileText size={28} />} title="No reports yet" hint="Tutors write reports from their Reports tab, or use Auto-draft above to generate a first pass for every student." />
        </div>
      ) : (
        <div className="space-y-3 mt-5">
          {reports.map((r) => (
            <div key={r.id} className="glass-card glass-card-pad">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: YEAR_COLORS[r.student.yearLevel] ?? '#009dff' }}>Y{r.student.yearLevel}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-dark">{r.student.firstName} {r.student.lastName} · {r.subject?.name ?? 'Overall'}</p>
                    <p className="text-xs text-[var(--muted)]">{r.term.name} · by {r.author?.name ?? 'tutor'} · effort: {r.effort ?? '-'}{r.attendancePct !== null ? ` · attendance ${r.attendancePct}%` : ''}</p>
                  </div>
                </div>
                <div className="flex-shrink-0"><PublishButton id={r.id} published={r.published} /></div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mt-2.5">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
