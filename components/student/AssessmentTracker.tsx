import { CalendarDays, FileText, FlaskConical, PencilRuler, GraduationCap } from 'lucide-react'
import { subjectColor } from '@/lib/student'

export type AssessmentItem = {
  id: string
  subject: string
  title: string
  kind: string
  dueWeek: number | null
  dueDate: Date | string | null
  notes?: string | null
}

const KIND_ICON: Record<string, typeof FileText> = {
  test: PencilRuler,
  assignment: FileText,
  investigation: FlaskConical,
  exam: GraduationCap,
}

const KIND_LABEL: Record<string, string> = {
  test: 'Test',
  assignment: 'Assignment',
  investigation: 'Investigation',
  exam: 'Exam',
}

function fmtDate(d: Date | string | null): string | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// A shared assessment roadmap built from uploaded course outlines. The same
// component is shown to students, parents, tutors and admin so everyone works
// from one timeline.
export default function AssessmentTracker({
  items,
  title = 'Assessment tracker',
  emptyHint = 'Upload a course outline and your assessment dates will appear here automatically.',
}: {
  items: AssessmentItem[]
  title?: string
  emptyHint?: string
}) {
  const sorted = [...items].sort((a, b) => {
    const av = a.dueDate ? new Date(a.dueDate).getTime() : (a.dueWeek ?? 99) * 1e10
    const bv = b.dueDate ? new Date(b.dueDate).getTime() : (b.dueWeek ?? 99) * 1e10
    return av - bv
  })
  const now = new Date().getTime()

  return (
    <section className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-1 flex items-center gap-2">
        <CalendarDays size={16} className="text-primary" /> {title}
      </h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 mt-2">{emptyHint}</p>
      ) : (
        <ol className="relative mt-3 ml-1.5" style={{ borderLeft: '2px solid rgba(15,42,79,.1)' }}>
          {sorted.map((a) => {
            const Icon = KIND_ICON[a.kind] ?? FileText
            const color = subjectColor(a.subject)
            const date = a.dueDate ? new Date(a.dueDate) : null
            const past = date ? date.getTime() < now : false
            return (
              <li key={a.id} className="relative pl-5 pb-5 last:pb-0">
                <span
                  className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full"
                  style={{ background: past ? '#CBD5E1' : color, boxShadow: '0 0 0 3px var(--bg-ivory)' }}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}1a`, color }}>
                    <Icon size={11} /> {KIND_LABEL[a.kind] ?? 'Task'}
                  </span>
                  <span className="text-[13px] font-semibold text-dark">{a.title}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {a.subject}
                  {a.dueWeek ? ` · Week ${a.dueWeek}` : ''}
                  {fmtDate(date) ? ` · ${fmtDate(date)}` : ''}
                  {past ? ' · done' : ''}
                </p>
                {a.notes && <p className="text-xs text-slate-400 mt-0.5">{a.notes}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
