import Link from 'next/link'
import { format } from 'date-fns'
import { Trash2, ArrowLeft } from 'lucide-react'
import { rawPrisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'
import RestoreButton from '@/components/admin/RestoreButton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/card'

export const metadata = { title: 'Trash - Admin' }
export const dynamic = 'force-dynamic'

type Row = { entity: string; entityLabel: string; id: string; label: string; sub: string; deletedAt: Date }

const ENTITY_LABEL: Record<string, string> = {
  Student: 'Student', StudentNote: 'Student note', StudentCredit: 'Account credit',
  Announcement: 'Announcement', TutorResource: 'Resource', Referral: 'Referral',
}

export default async function TrashPage() {
  // rawPrisma bypasses the soft-delete filter so we can see the deleted rows.
  const [students, notes, credits, announcements, resources, referrals] = await Promise.all([
    rawPrisma.student.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
    rawPrisma.studentNote.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
    rawPrisma.studentCredit.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
    rawPrisma.announcement.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
    rawPrisma.tutorResource.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
    rawPrisma.referral.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 100 }),
  ])

  const rows: Row[] = [
    ...students.map((s) => ({ entity: 'Student', entityLabel: ENTITY_LABEL.Student, id: s.id, label: `${s.firstName} ${s.lastName}`, sub: `Year ${s.yearLevel}`, deletedAt: s.deletedAt! })),
    ...notes.map((n) => ({ entity: 'StudentNote', entityLabel: ENTITY_LABEL.StudentNote, id: n.id, label: n.body.slice(0, 60), sub: n.category, deletedAt: n.deletedAt! })),
    ...credits.map((c) => ({ entity: 'StudentCredit', entityLabel: ENTITY_LABEL.StudentCredit, id: c.id, label: `$${(c.amountCents / 100).toFixed(2)} credit`, sub: c.reason, deletedAt: c.deletedAt! })),
    ...announcements.map((a) => ({ entity: 'Announcement', entityLabel: ENTITY_LABEL.Announcement, id: a.id, label: a.body.slice(0, 60), sub: 'class announcement', deletedAt: a.deletedAt! })),
    ...resources.map((r) => ({ entity: 'TutorResource', entityLabel: ENTITY_LABEL.TutorResource, id: r.id, label: r.title, sub: `${r.subject} · Year ${r.yearLevel}`, deletedAt: r.deletedAt! })),
    ...referrals.map((r) => ({ entity: 'Referral', entityLabel: ENTITY_LABEL.Referral, id: r.id, label: r.studentName, sub: r.subject ?? 'referral', deletedAt: r.deletedAt! })),
  ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())

  return (
    <AdminShell sub="Trash">
      <div className="flex items-center gap-2.5">
        <Trash2 size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Trash</h1>
      </div>
      <p className="portal-lede mt-1">Deleted records are kept here so an accidental deletion can be undone. Restore any item to bring it back exactly as it was.</p>

      <Link href="/admin/audit" className="inline-flex items-center gap-1.5 text-[12px] font-semibold mt-3 text-slate-500 hover:text-primary">
        <ArrowLeft size={14} /> Back to activity log
      </Link>

      {rows.length === 0 ? (
        <div className="glass-card mt-4">
          <EmptyState icon={<Trash2 size={28} />} title="Trash is empty" hint="Nothing has been deleted. When a record is removed it lands here so you can restore it." />
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="glass-card mt-4 overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'rgba(255,255,255,.4)' }}>
                    {['Deleted', 'Type', 'Record', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.entity}:${r.id}`} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap align-top">{format(r.deletedAt, 'd MMM, h:mma')}</td>
                      <td className="px-5 py-3.5 align-top"><Badge size="sm">{r.entityLabel}</Badge></td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="text-dark">{r.label || '(empty)'}</div>
                        <div className="text-xs text-[var(--muted)]">{r.sub}</div>
                      </td>
                      <td className="px-5 py-3.5 align-top text-right"><RestoreButton entity={r.entity} id={r.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards with a full-width Restore action */}
          <div className="mt-4 space-y-2.5 sm:hidden">
            {rows.map((r) => (
              <div key={`m:${r.entity}:${r.id}`} className="glass-card glass-card-pad">
                <div className="flex items-center gap-2 mb-1">
                  <Badge size="sm">{r.entityLabel}</Badge>
                  <span className="ml-auto text-xs text-[var(--muted)]">{format(r.deletedAt, 'd MMM, h:mma')}</span>
                </div>
                <div className="text-dark font-semibold">{r.label || '(empty)'}</div>
                <div className="text-xs text-[var(--muted)] mb-3">{r.sub}</div>
                <RestoreButton entity={r.entity} id={r.id} />
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  )
}
