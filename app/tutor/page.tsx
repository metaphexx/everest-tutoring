import Link from 'next/link'
import { MessagesSquare, FileText, CalendarDays, Printer, BookOpen, MessageCircleQuestion, Library, School } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { format, startOfDay, addDays } from 'date-fns'
import PortalShell from '@/components/portal/PortalShell'
import ClassCard from './ClassCard'
import TeachingPlanCard from './TeachingPlanCard'
import { weeklyTeachingPlan } from '@/lib/teaching'

export const metadata = { title: 'Tutor Dashboard' }
export const dynamic = 'force-dynamic'
// portal: glassy brand shell

type Status = 'present' | 'late' | 'absent' | 'excused' | 'unmarked'

export default async function TutorPage() {
  const user = await requireUser(['tutor'])

  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const monday = addDays(startOfDay(today), 1 - todayDow)
  const saturday = addDays(monday, 5)
  const sessionDateFor = (dow: number) => addDays(monday, dow - 1)

  // Tutors see only their classes; admins viewing this page see all.
  const tutorFilter = user.role === 'admin' ? {} : { tutorId: user.id }

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, ...tutorFilter },
    include: {
      enrollments: { where: { status: 'active' }, include: { student: true } },
      tutor: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { yearLevel: 'asc' }],
  })

  const subjectIds = subjects.map((s) => s.id)
  const subjectNames = [...new Set(subjects.map((s) => s.name))]

  // Student questions waiting for this tutor (surfaced first, not buried).
  const waitingQuestions = subjectIds.length
    ? await prisma.question.count({ where: { classId: { in: subjectIds }, status: 'waiting_for_tutor', blocked: false } })
    : 0

  // Upcoming HSHS assessments the school shared, for the tutor's subjects.
  const assessments = subjectNames.length
    ? await prisma.assessmentDate.findMany({
        where: { subject: { in: subjectNames }, date: { gte: startOfDay(today) } },
        orderBy: { date: 'asc' },
        take: 6,
      })
    : []

  // This week's attendance + lesson notes for those classes, in one query each.
  const [attendance, notes] = await Promise.all([
    prisma.attendance.findMany({
      where: { subjectId: { in: subjectIds }, classDate: { gte: monday, lt: saturday } },
    }),
    prisma.lessonNote.findMany({
      where: { subjectId: { in: subjectIds }, classDate: { gte: monday, lt: saturday } },
    }),
  ])

  const statusByKey = new Map<string, Status>()
  for (const a of attendance) {
    statusByKey.set(`${a.subjectId}:${a.studentId}:${format(a.classDate, 'yyyy-MM-dd')}`, a.status as Status)
  }
  const noteByKey = new Map<string, { summary: string; homework: string | null }>()
  for (const n of notes) {
    noteByKey.set(`${n.subjectId}:${format(n.classDate, 'yyyy-MM-dd')}`, { summary: n.summary, homework: n.homework })
  }

  const cards = subjects.map((s) => {
    const date = sessionDateFor(s.dayOfWeek)
    const dateStr = format(date, 'yyyy-MM-dd')
    const students = s.enrollments.map((e) => ({
      id: e.student.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
    }))
    const initialStatuses: Record<string, Status> = {}
    for (const st of students) {
      initialStatuses[st.id] = statusByKey.get(`${s.id}:${st.id}:${dateStr}`) ?? 'unmarked'
    }
    return {
      isToday: s.dayOfWeek === todayDow,
      subject: { id: s.id, name: s.name, yearLevel: s.yearLevel, startTime: s.startTime, endTime: s.endTime, color: s.color },
      dateStr,
      dateLabel: format(date, 'EEE d MMM'),
      students,
      initialStatuses,
      initialNote: noteByKey.get(`${s.id}:${dateStr}`) ?? null,
    }
  })

  const todayCards = cards.filter((c) => c.isToday)
  const weekCards = cards.filter((c) => !c.isToday)

  // Per-class teaching recommendations from the scanned outlines + assessments.
  const uniqueClasses = [...new Map(subjects.map((s) => [`${s.yearLevel}-${s.name}`, s])).values()]
  const teachingPlans = await Promise.all(
    uniqueClasses.map(async (s) => ({
      key: `${s.yearLevel}-${s.name}`,
      name: s.name,
      yearLevel: s.yearLevel,
      color: s.color,
      plan: await weeklyTeachingPlan({ yearLevel: s.yearLevel, subject: s.name }),
    })),
  )
  const hasAnyOutline = teachingPlans.some((p) => p.plan.hasOutline)

  return (
    <PortalShell eyebrow="Tutor" sub={format(today, 'EEEE, d MMMM')} user={user}>
      <div className="flex flex-wrap justify-end gap-2 mb-3">
        <Link href="/tutor/questions" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)' }}>
          <MessageCircleQuestion size={16} /> Questions
          {waitingQuestions > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold" style={{ background: '#fff', color: '#007ECC' }}>{waitingQuestions}</span>}
        </Link>
        <Link href="/tutor/classes" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <School size={16} /> Classrooms
        </Link>
        <Link href="/tutor/resources" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <Library size={16} /> Resources
        </Link>
        <Link href="/tutor/outlines" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <BookOpen size={16} /> Outlines
        </Link>
        <Link href="/tutor/runsheet" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <Printer size={16} /> Run-sheet
        </Link>
        <Link href="/tutor/reports" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <FileText size={16} /> Reports
        </Link>
        <Link href="/tutor/messages" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
          <MessagesSquare size={16} /> Messages
        </Link>
      </div>
      <div className="space-y-8">
        {assessments.length > 0 && (
          <div className="glass-card glass-card-pad" style={{ background: 'linear-gradient(135deg, rgba(0,157,255,.12), rgba(124,92,255,.12))', border: '1px solid rgba(124,92,255,.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={17} className="text-primary" />
              <h2 className="portal-section-title">Upcoming HSHS assessments</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Shared by the school - align your lessons to these.</p>
            <div className="flex flex-wrap gap-2">
              {assessments.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,.65)' }}>
                  <span className="font-semibold text-dark">Y{a.yearLevel} {a.subject}</span>
                  <span className="text-slate-600">{a.title}</span>
                  <span className="text-xs text-primary font-medium">{format(a.date, 'EEE d MMM')}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {hasAnyOutline && (
          <section>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="portal-section-title">Teaching plan this week</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(13,148,136,.12)', color: '#0D9488' }}>from HSHS outlines</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Suggested topic, prac and booklets for each class, aligned to the school&apos;s course outlines.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {teachingPlans.filter((p) => p.plan.hasOutline).map((p) => (
                <TeachingPlanCard key={p.key} subjectName={p.name} yearLevel={p.yearLevel} color={p.color} plan={p.plan} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h1 className="portal-title">Today&apos;s classes</h1>
          <p className="portal-lede">Tap each student to mark attendance - it saves instantly.</p>
          <div className="mt-5">
            {todayCards.length === 0 ? (
              <div className="glass-card glass-card-pad text-center">
                <p className="text-slate-500">No classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayCards.map((c) => (
                  <ClassCard key={c.subject.id} {...c} />
                ))}
              </div>
            )}
          </div>
        </section>

        {weekCards.length > 0 && (
          <section>
            <h2 className="portal-section-title mb-4">Rest of this week</h2>
            <div className="space-y-4">
              {weekCards.map((c) => (
                <ClassCard key={c.subject.id} {...c} />
              ))}
            </div>
          </section>
        )}

        {subjects.length === 0 && (
          <div className="glass-card glass-card-pad text-center">
            <p className="text-slate-500">You don&apos;t have any classes assigned yet.</p>
          </div>
        )}
      </div>
    </PortalShell>
  )
}
