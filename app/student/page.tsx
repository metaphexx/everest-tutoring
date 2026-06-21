import Link from 'next/link'
import type { Metadata } from 'next'
import {
  CalendarClock, MessageCircleQuestion, Upload, BookOpen, Library, MessagesSquare,
  Megaphone, FileText, ArrowRight, Clock, CheckCircle2,
} from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import {
  getStudentForUser, getStudentClasses, nextClass, whenLabel, formatTime, dayLong, subjectColor,
} from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import AskComposer, { type MaterialOption } from '@/components/student/AskComposer'

export const metadata: Metadata = { title: 'Learning Hub | Everest Tutoring' }

const QUICK_ACTIONS = [
  { href: '/student/ask', label: 'Ask tutor', Icon: MessageCircleQuestion, accent: '#009DFF' },
  { href: '/student/school-materials?upload=document', label: 'Upload worksheet', Icon: Upload, accent: '#7C5CFF' },
  { href: '/student/school-materials?upload=outline', label: 'Upload course outline', Icon: FileText, accent: '#22A05B' },
  { href: '/student/resources', label: 'View resources', Icon: Library, accent: '#F5A623' },
  { href: '/student/messages', label: 'Message tutor', Icon: MessagesSquare, accent: '#EC4899' },
  { href: '/student/classes', label: 'Classrooms', Icon: BookOpen, accent: '#00C2A8' },
]

export default async function StudentHome() {
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)

  if (!student) {
    return (
      <StudentShell>
        <div className="glass-card glass-card-pad text-center">
          <h1 className="portal-title mb-1">Welcome to Everest</h1>
          <p className="portal-lede">Your student profile is being set up. Please check back shortly, or ask a parent to contact the Everest team.</p>
        </div>
      </StudentShell>
    )
  }

  const classes = await getStudentClasses(student.id)
  const classIds = classes.map((c) => c.id)
  const subjectNames = Array.from(new Set(classes.map((c) => c.name)))
  const next = nextClass(classes)

  const [replies, unanswered, resources, outlines, documents, announcement] = await Promise.all([
    prisma.questionReply.findMany({
      where: { isTutor: true, blocked: false, question: { studentId: student.id } },
      include: { question: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.question.findMany({
      where: { studentId: student.id, status: 'waiting_for_tutor', blocked: false },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    subjectNames.length
      ? prisma.tutorResource.findMany({
          where: { visibleToStudents: true, yearLevel: student.yearLevel, subject: { in: subjectNames } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
      : [],
    prisma.studentCourseOutline.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' }, take: 4 }),
    prisma.schoolDocument.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' }, take: 4 }),
    classIds.length
      ? prisma.announcement.findFirst({
          where: { classId: { in: classIds }, moderationStatus: { not: 'needs_review' } },
          include: { class: { select: { name: true } }, author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : null,
  ])

  const materials: MaterialOption[] = [
    ...outlines.map((o) => ({ id: o.id, label: `${o.subject} course outline`, sourceType: 'course_outline' as const })),
    ...documents.map((d) => ({ id: d.id, label: d.title, sourceType: 'school_document' as const })),
  ]
  const latestUploads = [
    ...outlines.map((o) => ({ id: o.id, title: `${o.subject} course outline`, at: o.uploadedAt, kind: 'Course outline' })),
    ...documents.map((d) => ({ id: d.id, title: d.title, at: d.uploadedAt, kind: 'School document' })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 3)

  return (
    <StudentShell>
      {/* Welcome */}
      <div className="mb-5">
        <h1 className="portal-title">Hi {student.firstName} 👋</h1>
        <p className="portal-lede">Ask a question, share your school work, or check what is coming up.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Ask composer (the hero) */}
          <AskComposer
            classes={classes.map((c) => ({ id: c.id, name: c.name, yearLevel: c.yearLevel }))}
            materials={materials}
            defaultClassId={next?.cls.id}
          />

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="glass-stat flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform"
                style={{ padding: '14px' }}
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.accent}1a`, color: a.accent }}>
                  <a.Icon size={17} />
                </span>
                <span className="text-[13px] font-semibold text-dark leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{a.label}</span>
              </Link>
            ))}
          </div>

          {/* Recent tutor replies */}
          <section className="glass-card glass-card-pad">
            <div className="flex items-center justify-between mb-3">
              <h2 className="portal-section-title">Recent tutor replies</h2>
              <Link href="/student/messages" className="text-xs font-semibold text-primary inline-flex items-center gap-1">Messages <ArrowRight size={13} /></Link>
            </div>
            {replies.length === 0 ? (
              <p className="text-sm text-slate-400">No replies yet. When a tutor answers a question, it will show up here.</p>
            ) : (
              <ul className="space-y-2.5">
                {replies.map((r) => (
                  <li key={r.id}>
                    <Link href={`/student/questions/${r.question.id}`} className="block rounded-xl px-3.5 py-3 transition-colors hover:bg-white/60" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.07)' }}>
                      <p className="text-[13px] font-semibold text-dark truncate">{r.question.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{r.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Unanswered questions */}
          {unanswered.length > 0 && (
            <section className="glass-card glass-card-pad">
              <h2 className="portal-section-title mb-3">Waiting for your tutor</h2>
              <ul className="space-y-2">
                {unanswered.map((q) => (
                  <li key={q.id}>
                    <Link href={`/student/questions/${q.id}`} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-white/60" style={{ background: 'rgba(255,255,255,.5)' }}>
                      <Clock size={15} className="text-amber-500 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-dark truncate flex-1">{q.title}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,.14)', color: '#B45309' }}>Waiting</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Next class */}
          <section className="glass-card glass-card-pad">
            <h2 className="portal-section-title mb-3 flex items-center gap-2"><CalendarClock size={16} className="text-primary" /> Next class</h2>
            {next ? (
              <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${subjectColor(next.cls.name)}14, rgba(255,255,255,.4))`, border: `1px solid ${subjectColor(next.cls.name)}33` }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full mb-2" style={{ background: subjectColor(next.cls.name) }} />
                <p className="text-base font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{next.cls.name}</p>
                <p className="text-sm text-slate-600 mt-0.5">{whenLabel(next.date)} · {dayLong(next.cls.dayOfWeek)} {formatTime(next.cls.startTime)}</p>
                {next.cls.tutorName && <p className="text-xs text-slate-500 mt-1">with {next.cls.tutorName}</p>}
                <Link href={`/student/classes/${next.cls.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3">Open classroom <ArrowRight size={13} /></Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No upcoming classes scheduled.</p>
            )}
          </section>

          {/* Latest announcement */}
          {announcement && (
            <section className="glass-card glass-card-pad">
              <h2 className="portal-section-title mb-2 flex items-center gap-2"><Megaphone size={16} className="text-primary" /> Latest announcement</h2>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{announcement.class.name}</p>
              <p className="text-sm text-slate-700 leading-relaxed">{announcement.body}</p>
              <p className="text-xs text-slate-400 mt-2">{announcement.author.name}</p>
            </section>
          )}

          {/* Latest resources */}
          <section className="glass-card glass-card-pad">
            <div className="flex items-center justify-between mb-3">
              <h2 className="portal-section-title">Latest resources</h2>
              <Link href="/student/resources" className="text-xs font-semibold text-primary">All</Link>
            </div>
            {resources.length === 0 ? (
              <p className="text-sm text-slate-400">Your tutor has not shared any resources yet.</p>
            ) : (
              <ul className="space-y-2">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                    <Library size={15} className="text-amber-500 flex-shrink-0" />
                    <span className="text-dark font-medium truncate">{r.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Latest school uploads */}
          <section className="glass-card glass-card-pad">
            <div className="flex items-center justify-between mb-3">
              <h2 className="portal-section-title">My school materials</h2>
              <Link href="/student/school-materials" className="text-xs font-semibold text-primary">Manage</Link>
            </div>
            {latestUploads.length === 0 ? (
              <p className="text-sm text-slate-400">Upload your course outline so your tutor can align support to your school work.</p>
            ) : (
              <ul className="space-y-2">
                {latestUploads.map((u) => (
                  <li key={u.id} className="flex items-center gap-2.5 text-[13px]">
                    <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                    <span className="text-dark font-medium truncate flex-1">{u.title}</span>
                    <span className="text-[11px] text-slate-400">{u.kind}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </StudentShell>
  )
}
