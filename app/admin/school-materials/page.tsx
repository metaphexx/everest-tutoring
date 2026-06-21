import type { Metadata } from 'next'
import Link from 'next/link'
import { FolderOpen, BookOpen, FileText, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'

export const metadata: Metadata = { title: 'School materials · Admin' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

export default async function AdminSchoolMaterialsPage() {
  const [outlines, documents] = await Promise.all([
    prisma.studentCourseOutline.findMany({ include: { student: { select: { id: true, firstName: true, lastName: true } }, file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' }, take: 100 }),
    prisma.schoolDocument.findMany({ include: { student: { select: { id: true, firstName: true, lastName: true } }, file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' }, take: 100 }),
  ])

  return (
    <AdminShell sub="School materials">
      <div className="mb-5">
        <h1 className="portal-title flex items-center gap-2"><FolderOpen size={22} className="text-primary" /> Student school materials</h1>
        <p className="portal-lede">Course outlines and documents students have uploaded for their tutors.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3 flex items-center gap-2"><BookOpen size={16} className="text-primary" /> Course outlines ({outlines.length})</h2>
          {outlines.length === 0 ? <p className="text-sm text-slate-400">None yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {outlines.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-dark truncate">{o.subject} outline</p>
                    <Link href={`/admin/students/${o.student.id}`} className="text-[11px] text-slate-400 hover:text-primary">{o.student.firstName} {o.student.lastName} · {o.assessmentCount} assessments · {fmt(o.uploadedAt)}</Link>
                  </div>
                  {o.file?.url && <a href={o.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3 flex items-center gap-2"><FileText size={16} className="text-primary" /> Documents ({documents.length})</h2>
          {documents.length === 0 ? <p className="text-sm text-slate-400">None yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-dark truncate">{d.title}</p>
                    <Link href={`/admin/students/${d.student.id}`} className="text-[11px] text-slate-400 hover:text-primary">{d.student.firstName} {d.student.lastName} · {d.documentType} · {fmt(d.uploadedAt)}</Link>
                  </div>
                  {d.file?.url && <a href={d.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
