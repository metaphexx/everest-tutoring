import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  ArrowLeft, GraduationCap, CalendarClock, Library, MessageSquarePlus, ExternalLink,
} from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import {
  getStudentForUser, getStudentClasses, nextClass, whenLabel, formatTime, subjectColor,
} from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import AssessmentTracker, { type AssessmentItem } from '@/components/student/AssessmentTracker'
import QuestionCard, { type QuestionCardItem } from '@/components/student/QuestionCard'
import ClassPostComposer from '@/components/student/ClassPostComposer'
import StreamFeed, { type StreamItem } from '@/components/student/StreamFeed'

export const metadata: Metadata = { title: 'Classroom | Everest Tutoring' }
export const dynamic = 'force-dynamic'

const TABS = [
  ['stream', 'Stream'],
  ['questions', 'Questions'],
  ['resources', 'Resources'],
  ['materials', 'School materials'],
  ['messages', 'Messages'],
] as const

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'E'
}
function fmtAt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

type Tab = (typeof TABS)[number][0]

export default async function ClassPage({
  params, searchParams,
}: {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { classId } = await params
  const { tab: tabRaw } = await searchParams
  const tab: Tab = (TABS.find(([v]) => v === tabRaw)?.[0] ?? 'stream') as Tab

  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) return <StudentShell sub="Class"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>

  const classes = await getStudentClasses(student.id)
  const cls = classes.find((c) => c.id === classId)
  if (!cls) notFound()

  const next = nextClass([cls])
  const color = subjectColor(cls.name)

  // Build question list shared by Overview + Questions tabs.
  const questionRows = await prisma.question.findMany({
    where: {
      classId,
      blocked: false,
      OR: [{ studentId: student.id }, { visibility: 'public_to_class' }],
    },
    include: {
      student: { select: { id: true, firstName: true } },
      replies: { where: { blocked: false }, select: { isTutor: true } },
      _count: { select: { reactions: true, attachments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  const questions: QuestionCardItem[] = questionRows.map((q) => ({
    id: q.id,
    title: q.title,
    status: q.status,
    visibility: q.visibility,
    askedBy: q.student.id === student.id ? 'You' : q.student.firstName,
    replyCount: q.replies.length,
    reactionCount: q._count.reactions,
    attachmentCount: q._count.attachments,
    hasTutorReply: q.replies.some((r) => r.isTutor),
  }))

  // The classroom stream: tutor + student posts (Announcements) and shared
  // questions, newest first with pinned posts on top.
  const posts = await prisma.announcement.findMany({
    where: { classId, moderationStatus: { not: 'needs_review' } },
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const streamSource: { item: StreamItem; at: number; pinned: boolean }[] = [
    ...posts.map((p) => ({
      pinned: p.pinned,
      at: p.createdAt.getTime(),
      item: {
        id: p.id, kind: 'post' as const,
        authorName: p.author.name ?? 'Everest', authorInitials: initialsOf(p.author.name ?? 'Everest'),
        isTutor: p.author.role === 'tutor' || p.author.role === 'admin',
        mine: p.authorId === user.id, body: p.body, pinned: p.pinned, createdAt: fmtAt(p.createdAt),
      },
    })),
    ...questionRows.filter((q) => q.visibility === 'public_to_class').map((q) => ({
      pinned: false,
      at: q.createdAt.getTime(),
      item: {
        id: q.id, kind: 'question' as const, questionId: q.id,
        authorName: q.student.firstName, authorInitials: initialsOf(q.student.firstName),
        isTutor: false, mine: q.student.id === student.id, body: q.body, title: q.title,
        status: q.status, visibility: q.visibility, pinned: false,
        replyCount: q.replies.length, reactionCount: q._count.reactions, createdAt: fmtAt(q.createdAt),
      },
    })),
  ]
  streamSource.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.at - a.at))
  const streamItems = streamSource.map((s) => s.item)

  return (
    <StudentShell sub={cls.name}>
      <Link href="/student/classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={16} /> All classrooms
      </Link>

      {/* Class header */}
      <div className="glass-card glass-card-pad mb-4" style={{ borderLeft: `4px solid ${color}` }}>
        <h1 className="portal-title">{cls.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
          <span>Year {cls.yearLevel}</span>
          {cls.tutorName && <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} /> {cls.tutorName}</span>}
          {next && <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> Next: {whenLabel(next.date)} {formatTime(cls.startTime)}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)' }}>
        {TABS.map(([v, label]) => {
          const active = v === tab
          return (
            <Link
              key={v}
              href={`/student/classes/${classId}?tab=${v}`}
              className="text-[13px] font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap flex-shrink-0 transition-colors"
              style={active ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {tab === 'stream' && <StreamTab student={student} cls={cls} classId={classId} color={color} items={streamItems} authorInitials={initialsOf(user.name ?? 'You')} />}
      {tab === 'questions' && <QuestionsTab questions={questions} classId={classId} />}
      {tab === 'resources' && <ResourcesTab subject={cls.name} yearLevel={cls.yearLevel} classId={classId} />}
      {tab === 'materials' && <MaterialsTab studentId={student.id} subject={cls.name} />}
      {tab === 'messages' && <MessagesTab tutorName={cls.tutorName} />}
    </StudentShell>
  )
}

async function StreamTab({
  student, cls, classId, color, items, authorInitials,
}: {
  student: { id: string; yearLevel: number }
  cls: { id: string; name: string; yearLevel: number }
  classId: string
  color: string
  items: StreamItem[]
  authorInitials: string
}) {
  const [assessmentsRaw, resources, term] = await Promise.all([
    prisma.studentAssessment.findMany({ where: { studentId: student.id, subject: cls.name }, orderBy: { dueDate: 'asc' } }),
    prisma.tutorResource.findMany({ where: { visibleToStudents: true, OR: [{ classId }, { subject: cls.name, yearLevel: cls.yearLevel }] }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.term.findFirst({ where: { isActive: true }, select: { startDate: true, weeks: true } }),
  ])

  const assessments: AssessmentItem[] = assessmentsRaw.map((a) => ({ id: a.id, subject: a.subject, title: a.title, kind: a.kind, dueWeek: a.dueWeek, dueDate: a.dueDate, notes: a.notes }))

  let pct = 0
  let weekNow = 0
  if (term) {
    const elapsedMs = new Date().getTime() - new Date(term.startDate).getTime()
    weekNow = Math.max(0, Math.min(term.weeks, Math.floor(elapsedMs / (7 * 86400000)) + 1))
    pct = Math.round((weekNow / term.weeks) * 100)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <ClassPostComposer classId={classId} authorInitials={authorInitials} />
        <StreamFeed items={items} />
      </div>

      <div className="space-y-5">
        {term && (
          <section className="glass-card glass-card-pad">
            <h2 className="portal-section-title mb-2">Term progress</h2>
            <p className="text-xs text-slate-500 mb-2">Week {weekNow} of {term.weeks}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(15,42,79,.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #00FFFF)` }} />
            </div>
          </section>
        )}

        <AssessmentTracker items={assessments} title="Upcoming assessments" emptyHint="Upload this subject's course outline to see your assessment dates." />

        <section className="glass-card glass-card-pad">
          <div className="flex items-center justify-between mb-3">
            <h2 className="portal-section-title">Resources this week</h2>
            <Link href={`/student/classes/${classId}?tab=resources`} className="text-xs font-semibold text-primary">All</Link>
          </div>
          {resources.length === 0 ? (
            <p className="text-sm text-slate-400">No resources shared yet.</p>
          ) : (
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 text-[13px]"><Library size={15} className="text-amber-500 flex-shrink-0" /><span className="text-dark font-medium truncate">{r.title}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function QuestionsTab({ questions }: { questions: QuestionCardItem[]; classId: string }) {
  return (
    <section className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-3">Class questions</h2>
      {questions.length === 0 ? (
        <p className="text-sm text-slate-400">No questions yet. Ask the first one from the Stream tab.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">{questions.map((q) => <QuestionCard key={q.id} q={q} />)}</div>
      )}
    </section>
  )
}

async function ResourcesTab({ subject, yearLevel, classId }: { subject: string; yearLevel: number; classId: string }) {
  const resources = await prisma.tutorResource.findMany({
    where: { visibleToStudents: true, OR: [{ classId }, { subject, yearLevel }] },
    include: { file: { select: { url: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <section className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-3">Resources</h2>
      {resources.length === 0 ? (
        <p className="text-sm text-slate-400">Your tutor has not shared any resources for this class yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,166,35,.14)', color: '#B45309' }}><Library size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-dark truncate">{r.title}</p>
                <p className="text-xs text-slate-400">{[r.fileType, r.weekNumber ? `Week ${r.weekNumber}` : null, r.topic].filter(Boolean).join(' · ') || 'Resource'}</p>
              </div>
              {r.file?.url && <a href={r.file.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open resource"><ExternalLink size={15} /></a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

async function MaterialsTab({ studentId, subject }: { studentId: string; subject: string }) {
  const [outlines, documents] = await Promise.all([
    prisma.studentCourseOutline.findMany({ where: { studentId, subject }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
    prisma.schoolDocument.findMany({ where: { studentId, subject }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
  ])
  const items = [
    ...outlines.map((o) => ({ id: o.id, title: `${o.subject} course outline`, url: o.file?.url ?? null })),
    ...documents.map((d) => ({ id: d.id, title: d.title, url: d.file?.url ?? null })),
  ]
  return (
    <section className="glass-card glass-card-pad">
      <div className="flex items-center justify-between mb-3">
        <h2 className="portal-section-title">Your school materials</h2>
        <Link href="/student/school-materials" className="text-xs font-semibold text-primary">Manage</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing uploaded for {subject} yet. Add your course outline or a worksheet from School materials.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-dark truncate">{m.title}</p></div>
              {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open file"><ExternalLink size={15} /></a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MessagesTab({ tutorName }: { tutorName: string | null }) {
  return (
    <section className="glass-card glass-card-pad text-center">
      <p className="text-sm text-slate-600 mb-3">Chat privately with {tutorName ?? 'your tutor'} about this class.</p>
      <Link href="/student/messages" className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', fontFamily: 'var(--font-display)' }}>
        <MessageSquarePlus size={16} /> Open messages
      </Link>
    </section>
  )
}
