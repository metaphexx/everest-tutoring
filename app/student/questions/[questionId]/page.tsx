import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Lock, Users, BookOpen, FileText, Paperclip, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { getStudentForUser } from '@/lib/student'
import { statusMeta } from '@/lib/question-status'
import StudentShell from '@/components/portal/StudentShell'
import QuestionThread, { type ReplyItem } from '@/components/student/QuestionThread'

export const metadata: Metadata = { title: 'Question | Everest Tutoring' }

function fmt(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function QuestionDetailPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) return <StudentShell sub="Question"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      student: { select: { id: true, firstName: true } },
      class: { select: { name: true, yearLevel: true } },
      replies: { where: { blocked: false }, include: { author: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: { include: { outline: { select: { subject: true } }, document: { select: { title: true } }, file: { select: { url: true, originalName: true } } } },
      _count: { select: { reactions: true } },
    },
  })
  if (!question || question.blocked) notFound()

  const isOwner = question.student.id === student.id
  // Access: owner, or a classmate if the question is shared with the class.
  if (!isOwner) {
    if (question.visibility !== 'public_to_class') notFound()
    const inClass = await prisma.enrollment.findFirst({ where: { studentId: student.id, subjectId: question.classId, status: 'active' }, select: { id: true } })
    if (!inClass) notFound()
  }

  const reacted = (await prisma.questionReaction.findUnique({ where: { questionId_studentId: { questionId: question.id, studentId: student.id } } })) !== null
  const meta = statusMeta(question.status)
  // Anyone who can see the question can join in if it is shared with the class.
  const canReply = isOwner || question.visibility === 'public_to_class'

  const replies: ReplyItem[] = question.replies.map((r) => ({
    id: r.id,
    body: r.body,
    authorName: r.author.name ?? (r.isTutor ? 'Tutor' : 'Student'),
    isTutor: r.isTutor,
    mine: r.authorId === user.id,
    helpful: r.helpful,
    pinned: r.pinned,
    createdAt: fmt(r.createdAt),
  }))

  return (
    <StudentShell sub="Question">
      <Link href="/student" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="glass-card glass-card-pad mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}>
            {question.visibility === 'public_to_class' ? <><Users size={11} /> Shared with class</> : <><Lock size={11} /> Private to tutor</>}
          </span>
          <span className="text-[11px] text-slate-400">{question.class.name} · Year {question.class.yearLevel}</span>
        </div>
        <h1 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{question.title}</h1>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mt-1.5">{question.body}</p>
        <p className="text-[11px] text-slate-400 mt-2">{isOwner ? 'You' : question.student.firstName} · {fmt(question.createdAt)}</p>

        {question.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {question.attachments.map((a) => {
              const label = a.outline ? `${a.outline.subject} course outline` : a.document ? a.document.title : (a.file?.originalName ?? 'Attachment')
              const Icon = a.outline ? BookOpen : a.document ? FileText : Paperclip
              const href = a.file?.url
              const inner = (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}>
                  <Icon size={12} /> {label} {href && <ExternalLink size={11} />}
                </span>
              )
              return href ? (
                <a key={a.id} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <span key={a.id}>{inner}</span>
              )
            })}
          </div>
        )}
      </div>

      <QuestionThread
        questionId={question.id}
        isOwner={isOwner}
        canReply={canReply}
        status={question.status}
        reactionCount={question._count.reactions}
        reacted={reacted}
        replies={replies}
      />
    </StudentShell>
  )
}
