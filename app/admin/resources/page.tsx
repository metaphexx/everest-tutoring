import type { Metadata } from 'next'
import { Library, ExternalLink, EyeOff } from 'lucide-react'
import { prisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'

export const metadata: Metadata = { title: 'Resources · Admin' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

export default async function AdminResourcesPage() {
  const resources = await prisma.tutorResource.findMany({
    include: { uploadedBy: { select: { name: true } }, class: { select: { name: true, yearLevel: true } }, file: { select: { url: true } } },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })

  return (
    <AdminShell sub="Resources">
      <div className="mb-5">
        <h1 className="portal-title flex items-center gap-2"><Library size={22} className="text-primary" /> Tutor resources</h1>
        <p className="portal-lede">Booklets, worksheets and practice tests shared by tutors.</p>
      </div>

      <div className="glass-card overflow-hidden">
        {resources.length === 0 ? <p className="text-sm text-slate-400 p-5 text-center">No resources yet.</p> : (
          <div className="divide-y" style={{ borderColor: 'rgba(15,42,79,.06)' }}>
            {resources.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-dark truncate">{r.title} {!r.visibleToStudents && <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><EyeOff size={10} /> hidden</span>}</p>
                  <p className="text-[11px] text-slate-400">{[r.class ? `${r.class.name} Y${r.class.yearLevel}` : `${r.subject} Y${r.yearLevel}`, r.fileType, r.uploadedBy.name, fmt(r.createdAt)].filter(Boolean).join(' · ')}</p>
                </div>
                {r.file?.url && <a href={r.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
