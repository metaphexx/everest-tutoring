import Link from 'next/link'
import type { Metadata } from 'next'
import { Library, ExternalLink, Sparkles, FileText, ClipboardCheck, BookOpen, KeyRound, NotebookPen } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getStudentForUser, getStudentClasses } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'

export const metadata: Metadata = { title: 'Resources | Everest Tutoring' }

const TYPE_META: Record<string, { label: string; Icon: typeof FileText; color: string }> = {
  practice_test: { label: 'Practice tests', Icon: ClipboardCheck, color: '#009DFF' },
  booklet: { label: 'Booklets', Icon: BookOpen, color: '#7C5CFF' },
  worksheet: { label: 'Worksheets', Icon: FileText, color: '#22A05B' },
  revision: { label: 'Revision sheets', Icon: NotebookPen, color: '#F5A623' },
  answer_key: { label: 'Answer keys', Icon: KeyRound, color: '#EC4899' },
  other: { label: 'Other', Icon: Library, color: '#5E6B7C' },
}

type ResourceLite = { id: string; title: string; fileType: string; subject: string; weekNumber: number | null; topic: string | null; url: string | null; createdAt: Date }

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ subject?: string; type?: string }> }) {
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) return <StudentShell sub="Resources"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>

  const { subject: subjectFilter, type: typeFilter } = await searchParams
  const classes = await getStudentClasses(student.id)
  const subjectNames = Array.from(new Set(classes.map((c) => c.name)))

  const resourcesRaw = subjectNames.length
    ? await prisma.tutorResource.findMany({
        where: {
          visibleToStudents: true,
          yearLevel: student.yearLevel,
          subject: subjectFilter && subjectFilter !== 'all' ? subjectFilter : { in: subjectNames },
          ...(typeFilter && typeFilter !== 'all' ? { fileType: typeFilter } : {}),
        },
        include: { file: { select: { url: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const resources: ResourceLite[] = resourcesRaw.map((r) => ({ id: r.id, title: r.title, fileType: r.fileType ?? 'other', subject: r.subject, weekNumber: r.weekNumber, topic: r.topic, url: r.file?.url ?? null, createdAt: r.createdAt }))

  const recent = resources.slice(0, 4)
  const byType = new Map<string, ResourceLite[]>()
  for (const r of resources) {
    const k = r.fileType
    if (!byType.has(k)) byType.set(k, [])
    byType.get(k)!.push(r)
  }

  return (
    <StudentShell sub="Resources">
      <div className="mb-4">
        <h1 className="portal-title">Resources</h1>
        <p className="portal-lede">Extra practice from your tutors. Stuck on something specific? <Link href="/student/ask" className="text-primary font-semibold">Ask a question</Link> instead.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)' }}>
          <FilterLink href={`/student/resources?type=${typeFilter ?? 'all'}`} active={!subjectFilter || subjectFilter === 'all'}>All subjects</FilterLink>
          {subjectNames.map((s) => (
            <FilterLink key={s} href={`/student/resources?subject=${s}${typeFilter ? `&type=${typeFilter}` : ''}`} active={subjectFilter === s}>{s}</FilterLink>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)' }}>
          <FilterLink href={`/student/resources${subjectFilter ? `?subject=${subjectFilter}` : ''}`} active={!typeFilter || typeFilter === 'all'}>All types</FilterLink>
          {Object.entries(TYPE_META).filter(([k]) => k !== 'other').map(([k, m]) => (
            <FilterLink key={k} href={`/student/resources?type=${k}${subjectFilter ? `&subject=${subjectFilter}` : ''}`} active={typeFilter === k}>{m.label}</FilterLink>
          ))}
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="glass-card glass-card-pad text-center">
          <p className="text-sm text-slate-500">No resources here yet. Your tutor will add booklets and practice tests during the term.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recently added */}
          {(!subjectFilter && !typeFilter) && (
            <Shelf title="Recently added" Icon={Sparkles} color="#009DFF">
              {recent.map((r) => <ResourceCard key={r.id} r={r} />)}
            </Shelf>
          )}

          {/* Grouped by type */}
          {[...byType.entries()].map(([type, list]) => {
            const m = TYPE_META[type] ?? TYPE_META.other
            return (
              <Shelf key={type} title={m.label} Icon={m.Icon} color={m.color}>
                {list.map((r) => <ResourceCard key={r.id} r={r} />)}
              </Shelf>
            )
          })}
        </div>
      )}
    </StudentShell>
  )
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors" style={active ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>{children}</Link>
  )
}

function Shelf({ title, Icon, color, children }: { title: string; Icon: typeof Library; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="portal-section-title mb-3 flex items-center gap-2"><Icon size={16} style={{ color }} /> {title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  )
}

function ResourceCard({ r }: { r: ResourceLite }) {
  const m = TYPE_META[r.fileType] ?? TYPE_META.other
  const card = (
    <div className="glass-card glass-card-pad h-full transition-transform hover:-translate-y-0.5">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${m.color}1a`, color: m.color }}><m.Icon size={17} /></span>
      <p className="text-[14px] font-bold text-dark leading-snug" style={{ fontFamily: 'var(--font-display)' }}>{r.title}</p>
      <p className="text-xs text-slate-400 mt-1">{[r.subject, r.weekNumber ? `Week ${r.weekNumber}` : null, r.topic].filter(Boolean).join(' · ')}</p>
      {r.url && <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2">Open <ExternalLink size={12} /></span>}
    </div>
  )
  return r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{card}</a> : <div>{card}</div>
}
