import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import ResourcesClient, { type ClassOpt, type ResourceRow, type AnnouncementRow } from './ResourcesClient'

export const metadata: Metadata = { title: 'Resources · Tutor' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

export default async function TutorResourcesPage() {
  const user = await requireUser(['tutor'])
  const classFilter = user.role === 'admin' ? {} : { tutorId: user.id }

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, ...classFilter },
    select: { id: true, name: true, yearLevel: true },
    orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }],
  })
  const classes: ClassOpt[] = subjects.map((s) => ({ id: s.id, label: `${s.name} · Year ${s.yearLevel}`, subject: s.name, yearLevel: s.yearLevel }))
  const classIds = subjects.map((s) => s.id)

  const [resourcesRaw, announcementsRaw] = await Promise.all([
    prisma.tutorResource.findMany({ where: user.role === 'admin' ? {} : { uploadedByTutorId: user.id }, include: { file: { select: { url: true } }, class: { select: { name: true, yearLevel: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.announcement.findMany({ where: classIds.length ? { classId: { in: classIds } } : { authorId: user.id }, include: { class: { select: { name: true, yearLevel: true } } }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], take: 20 }),
  ])

  const resources: ResourceRow[] = resourcesRaw.map((r) => ({
    id: r.id,
    title: r.title,
    meta: [r.class ? `${r.class.name} Y${r.class.yearLevel}` : `${r.subject} Y${r.yearLevel}`, r.fileType, r.weekNumber ? `Week ${r.weekNumber}` : null, r.topic].filter(Boolean).join(' · '),
    visible: r.visibleToStudents,
    url: r.file?.url ?? null,
  }))
  const announcements: AnnouncementRow[] = announcementsRaw.map((a) => ({ id: a.id, className: `${a.class.name} Y${a.class.yearLevel}`, body: a.body, createdAt: fmt(a.createdAt), pinned: a.pinned }))

  return (
    <PortalShell eyebrow="Tutor" sub="Resources" user={user}>
      <Link href="/tutor" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4"><ArrowLeft size={15} /> Dashboard</Link>
      <div className="mb-5">
        <h1 className="portal-title">Resources and announcements</h1>
        <p className="portal-lede">Share booklets, worksheets and practice tests, and post quick updates to your classes.</p>
      </div>
      <ResourcesClient classes={classes} resources={resources} announcements={announcements} />
    </PortalShell>
  )
}
