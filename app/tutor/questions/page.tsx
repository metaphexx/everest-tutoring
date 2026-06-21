import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Lock, Users, Paperclip, BookOpen, FileText, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { statusMeta } from '@/lib/question-status'
import PortalShell from '@/components/portal/PortalShell'
import TutorQuestionPanel, { type TutorReplyItem } from '@/components/tutor/TutorQuestionPanel'

export const metadata: Metadata = { title: 'Questions · Tutor' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function TutorQuestionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await requireUser(['tutor'])
  const { q: selectedId, status: statusFilter } = await searchParams

  const classFilter = user.role === 'admin' ? {} : { class: { tutorId: user.id } }
  const where = {
    blocked: false,
    ...classFilter,
    ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const questions = await prisma.question.findMany({
    where,
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, yearLevel: true } },
      replies: { where: { blocked: false }, select: { isTutor: true } },
      _count: { select: { reactions: true, attachments: true } },
    },
    // Unanswered first, then newest.
    orderBy: [{ createdAt: 'desc' }],
    take: 80,
  })
  // Surface questions still waiting for a tutor at the top.
  questions.sort((a, b) => {
    const aw = a.status === 'waiting_for_tutor' ? 0 : 1
    const bw = b.status === 'waiting_for_tutor' ? 0 : 1
    return aw - bw
  })

  const waiting = questions.filter((q) => q.status === 'waiting_for_tutor').length

  let selected: Awaited<ReturnType<typeof loadSelected>> = null
  if (selectedId) selected = await loadSelected(selectedId, user)

  const STATUS_TABS = [['all', 'All'], ['waiting_for_tutor', 'Waiting'], ['follow_up_needed', 'Follow-up'], ['tutor_replied', 'Replied'], ['solved', 'Solved']] as const

  return (
    <PortalShell eyebrow="Tutor" sub="Questions" user={user}>
      <Link href="/tutor" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4"><ArrowLeft size={15} /> Dashboard</Link>
      <div className="mb-4">
        <h1 className="portal-title">Student questions</h1>
        <p className="portal-lede">{waiting > 0 ? `${waiting} question${waiting === 1 ? '' : 's'} waiting for you.` : 'You are all caught up. Nice work.'}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)', width: 'fit-content' }}>
        {STATUS_TABS.map(([v, label]) => {
          const active = (statusFilter ?? 'all') === v
          return (
            <Link key={v} href={`/tutor/questions?status=${v}`} className="text-[13px] font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors" style={active ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>{label}</Link>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        {/* Inbox list */}
        <div className="glass-card overflow-hidden">
          {questions.length === 0 ? (
            <p className="text-sm text-slate-400 p-5 text-center">No questions here.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(15,42,79,.06)' }}>
              {questions.map((q) => {
                const active = q.id === selectedId
                const meta = statusMeta(q.status)
                return (
                  <Link key={q.id} href={`/tutor/questions?q=${q.id}${statusFilter ? `&status=${statusFilter}` : ''}`} className="block px-4 py-3 transition-colors" style={{ background: active ? 'rgba(0,157,255,.1)' : 'transparent' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{q.class.name} Y{q.class.yearLevel}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-dark line-clamp-2">{q.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{q.student.firstName} {q.student.lastName}{q.visibility === 'public_to_class' ? ' · shared' : ' · private'}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div>
            <div className="glass-card glass-card-pad mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}>
                  {selected.visibility === 'public_to_class' ? <><Users size={11} /> Shared with class</> : <><Lock size={11} /> Private</>}
                </span>
                <span className="text-[11px] text-slate-400">{selected.className} · {selected.studentName}</span>
              </div>
              <h2 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{selected.title}</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mt-1.5">{selected.body}</p>
              {selected.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selected.attachments.map((a) => {
                    const Icon = a.kind === 'course_outline' ? BookOpen : a.kind === 'school_document' ? FileText : Paperclip
                    const inner = <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}><Icon size={12} /> {a.label} {a.url && <ExternalLink size={11} />}</span>
                    return a.url ? <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">{inner}</a> : <span key={a.id}>{inner}</span>
                  })}
                </div>
              )}
            </div>
            <TutorQuestionPanel questionId={selected.id} status={selected.status} replies={selected.replies} />
          </div>
        ) : (
          <div className="glass-card glass-card-pad flex items-center justify-center text-sm text-slate-400" style={{ minHeight: 240 }}>
            Select a question to answer it.
          </div>
        )}
      </div>
    </PortalShell>
  )
}

async function loadSelected(id: string, user: { id: string; role: string }) {
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, yearLevel: true, tutorId: true } },
      replies: { where: { blocked: false }, include: { author: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: { include: { outline: { select: { subject: true } }, document: { select: { title: true } }, file: { select: { url: true, originalName: true } } } },
    },
  })
  if (!q || q.blocked) return null
  if (user.role !== 'admin' && q.class.tutorId !== user.id) return null
  const replies: TutorReplyItem[] = q.replies.map((r) => ({
    id: r.id, body: r.body, authorName: r.author.name ?? (r.isTutor ? 'Tutor' : 'Student'),
    isTutor: r.isTutor, helpful: r.helpful, pinned: r.pinned, createdAt: fmt(r.createdAt),
  }))
  return {
    id: q.id,
    title: q.title,
    body: q.body,
    status: q.status,
    visibility: q.visibility,
    className: `${q.class.name} Y${q.class.yearLevel}`,
    studentName: `${q.student.firstName} ${q.student.lastName}`,
    replies,
    attachments: q.attachments.map((a) => ({
      id: a.id,
      kind: a.sourceType,
      label: a.outline ? `${a.outline.subject} course outline` : a.document ? a.document.title : (a.file?.originalName ?? 'Attachment'),
      url: a.file?.url ?? null,
    })),
  }
}
