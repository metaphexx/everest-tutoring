import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, GraduationCap, Users, MessageCircleQuestion, Library } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { formatTime, dayLong } from '@/lib/student'
import PortalShell from '@/components/portal/PortalShell'
import TutorClassStream, { type TutorStreamItem } from '@/components/tutor/TutorClassStream'

export const metadata: Metadata = { title: 'Classroom · Tutor' }
export const dynamic = 'force-dynamic'

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'E'
}
function fmtAt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

export default async function TutorClassroomPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const user = await requireUser(['tutor'])

  const cls = await prisma.subject.findUnique({
    where: { id: classId },
    include: { tutor: { select: { name: true } }, term: { select: { isActive: true } }, _count: { select: { enrollments: { where: { status: 'active' } } } } },
  })
  if (!cls) notFound()
  if (user.role !== 'admin' && cls.tutorId !== user.id) notFound()

  const [posts, questionRows, waiting] = await Promise.all([
    prisma.announcement.findMany({ where: { classId, moderationStatus: { not: 'needs_review' } }, include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.question.findMany({
      where: { classId, blocked: false, visibility: 'public_to_class' },
      include: { student: { select: { firstName: true } }, replies: { where: { blocked: false }, select: { isTutor: true } }, _count: { select: { reactions: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.question.count({ where: { classId, blocked: false, status: 'waiting_for_tutor' } }),
  ])

  const source: { item: TutorStreamItem; at: number; pinned: boolean }[] = [
    ...posts.map((p) => ({
      pinned: p.pinned, at: p.createdAt.getTime(),
      item: {
        id: p.id, kind: 'post' as const,
        authorName: p.author.name ?? 'Everest', authorInitials: initialsOf(p.author.name ?? 'Everest'),
        isTutor: p.author.role === 'tutor' || p.author.role === 'admin', mine: p.authorId === user.id,
        body: p.body, pinned: p.pinned, createdAt: fmtAt(p.createdAt),
      },
    })),
    ...questionRows.map((q) => ({
      pinned: false, at: q.createdAt.getTime(),
      item: {
        id: q.id, kind: 'question' as const, questionId: q.id,
        authorName: q.student.firstName, authorInitials: initialsOf(q.student.firstName),
        isTutor: false, mine: false, body: q.body, title: q.title, status: q.status, pinned: false,
        replyCount: q.replies.length, reactionCount: q._count.reactions, createdAt: fmtAt(q.createdAt),
      },
    })),
  ]
  source.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.at - a.at))
  const items = source.map((s) => s.item)

  return (
    <PortalShell eyebrow="Tutor" sub={`${cls.name} classroom`} user={user}>
      <Link href="/tutor/classes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4"><ArrowLeft size={15} /> All classrooms</Link>

      {/* Header */}
      <div className="glass-card glass-card-pad mb-4" style={{ borderLeft: '4px solid #009DFF' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="portal-title">{cls.name} · Year {cls.yearLevel}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Users size={14} /> {cls._count.enrollments} students</span>
              <span>{dayLong(cls.dayOfWeek)} {formatTime(cls.startTime)}</span>
              {cls.tutor?.name && <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} /> {cls.tutor.name}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/tutor/questions" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
              <MessageCircleQuestion size={14} /> Questions{waiting > 0 ? ` (${waiting})` : ''}
            </Link>
            <Link href="/tutor/resources" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.1)', color: '#404B5C' }}>
              <Library size={14} /> Resources
            </Link>
          </div>
        </div>
      </div>

      <TutorClassStream classId={classId} items={items} authorInitials={initialsOf(user.name ?? 'Tutor')} />
    </PortalShell>
  )
}
