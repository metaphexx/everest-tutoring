import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, BookOpen, FileText, MessageCircleQuestion, GraduationCap, ExternalLink, ClipboardList } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import AssessmentTracker, { type AssessmentItem } from '@/components/student/AssessmentTracker'

export const metadata: Metadata = { title: 'Student materials · Tutor' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

type Event = { at: Date; icon: typeof BookOpen; color: string; title: string; detail?: string; href?: string | null }

export default async function StudentMaterialsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const user = await requireUser(['tutor'])

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, firstName: true, lastName: true, yearLevel: true } })
  if (!student) notFound()

  // A tutor may only view students in one of their classes (admins see all).
  if (user.role !== 'admin') {
    const link = await prisma.enrollment.findFirst({ where: { studentId, status: 'active', subject: { tutorId: user.id } }, select: { id: true } })
    if (!link) notFound()
  }

  const [outlines, documents, assessmentsRaw, questions] = await Promise.all([
    prisma.studentCourseOutline.findMany({ where: { studentId }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
    prisma.schoolDocument.findMany({ where: { studentId }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
    prisma.studentAssessment.findMany({ where: { studentId }, orderBy: { dueDate: 'asc' } }),
    prisma.question.findMany({ where: { studentId, blocked: false }, include: { class: { select: { name: true } }, replies: { where: { blocked: false, isTutor: true }, orderBy: { createdAt: 'asc' }, take: 1, include: { author: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } }),
  ])

  const assessments: AssessmentItem[] = assessmentsRaw.map((a) => ({ id: a.id, subject: a.subject, title: a.title, kind: a.kind, dueWeek: a.dueWeek, dueDate: a.dueDate, notes: a.notes }))

  // Build the context timeline: outline -> schedule -> document -> question -> response.
  const events: Event[] = []
  for (const o of outlines) {
    events.push({ at: o.uploadedAt, icon: BookOpen, color: '#009DFF', title: `Uploaded ${o.subject} course outline`, href: o.file?.url ?? null })
    if (o.assessmentCount > 0) events.push({ at: o.uploadedAt, icon: ClipboardList, color: '#7C5CFF', title: `Assessment schedule extracted`, detail: `${o.assessmentCount} assessments for ${o.subject}` })
  }
  for (const d of documents) events.push({ at: d.uploadedAt, icon: FileText, color: '#6D28D9', title: `Uploaded ${d.title}`, detail: d.subject ?? undefined, href: d.file?.url ?? null })
  for (const q of questions) {
    events.push({ at: q.createdAt, icon: MessageCircleQuestion, color: '#F5A623', title: `Asked: ${q.title}`, detail: q.class.name, href: `/tutor/questions?q=${q.id}` })
    const reply = q.replies[0]
    if (reply) events.push({ at: reply.createdAt, icon: GraduationCap, color: '#22A05B', title: `Tutor responded`, detail: `${reply.author.name ?? 'Tutor'} · ${q.class.name}`, href: `/tutor/questions?q=${q.id}` })
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <PortalShell eyebrow="Tutor" sub="Student materials" user={user}>
      <Link href="/tutor/questions" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4"><ArrowLeft size={15} /> Questions</Link>
      <div className="mb-5">
        <h1 className="portal-title">{student.firstName} {student.lastName}</h1>
        <p className="portal-lede">Year {student.yearLevel} · the context behind their questions, from school work to your answers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Timeline */}
          <section className="glass-card glass-card-pad">
            <h2 className="portal-section-title mb-3">Activity timeline</h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No school materials or questions yet.</p>
            ) : (
              <ol className="relative ml-1.5" style={{ borderLeft: '2px solid rgba(15,42,79,.1)' }}>
                {events.map((e, i) => (
                  <li key={i} className="relative pl-5 pb-4 last:pb-0">
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ background: e.color, boxShadow: '0 0 0 3px var(--bg-ivory)' }} aria-hidden="true" />
                    <div className="flex items-center gap-2">
                      <e.icon size={14} style={{ color: e.color }} />
                      {e.href && e.href.startsWith('/') ? (
                        <Link href={e.href} className="text-[13px] font-semibold text-dark hover:text-primary">{e.title}</Link>
                      ) : e.href ? (
                        <a href={e.href} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-dark hover:text-primary inline-flex items-center gap-1">{e.title} <ExternalLink size={11} /></a>
                      ) : (
                        <span className="text-[13px] font-semibold text-dark">{e.title}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{[e.detail, fmt(e.at)].filter(Boolean).join(' · ')}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Materials lists */}
          <section className="glass-card glass-card-pad">
            <h2 className="portal-section-title mb-3">School materials</h2>
            {outlines.length === 0 && documents.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {outlines.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-2.5">
                    <BookOpen size={15} className="text-primary flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-dark flex-1 truncate">{o.subject} course outline</span>
                    <span className="text-[11px] text-slate-400">{o.assessmentCount} assessments</span>
                    {o.file?.url && <a href={o.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
                  </li>
                ))}
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <FileText size={15} className="text-violet-500 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-dark flex-1 truncate">{d.title}</span>
                    <span className="text-[11px] text-slate-400">{d.documentType}</span>
                    {d.file?.url && <a href={d.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <AssessmentTracker items={assessments} title="Assessment schedule" emptyHint="No assessments extracted yet." />
        </div>
      </div>
    </PortalShell>
  )
}
