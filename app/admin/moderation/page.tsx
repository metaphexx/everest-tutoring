import type { Metadata } from 'next'
import { ShieldAlert, Lock, MessageCircleQuestion, MessagesSquare, FileText, Megaphone } from 'lucide-react'
import { prisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'
import ModerationActions from './ModerationActions'
import type { ModKind } from './actions'

export const metadata: Metadata = { title: 'Moderation · Admin' }
export const dynamic = 'force-dynamic'

type ModItem = {
  kind: ModKind
  id: string
  Icon: typeof MessagesSquare
  who: string
  context: string
  body: string
  category: string | null
  severity: string | null
  blocked: boolean
  status: string
  at: Date
  canReportParent?: boolean
  reportedToParent?: boolean
}

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

export default async function ModerationPage() {
  const [messages, questions, replies, documents, announcements] = await Promise.all([
    prisma.message.findMany({
      where: { OR: [{ flagged: true }, { blocked: true }] },
      include: { sender: { select: { name: true, role: true } }, conversation: { select: { type: true, parent: { select: { email: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
    prisma.question.findMany({
      where: { OR: [{ blocked: true }, { moderationStatus: { in: ['flagged', 'needs_review'] } }] },
      include: { student: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
    prisma.questionReply.findMany({
      where: { OR: [{ blocked: true }, { moderationStatus: { in: ['flagged', 'needs_review'] } }] },
      include: { author: { select: { name: true, role: true } }, question: { select: { title: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
    prisma.schoolDocument.findMany({
      where: { moderationStatus: { in: ['flagged', 'needs_review'] } },
      include: { student: { select: { firstName: true, lastName: true } } },
      orderBy: { uploadedAt: 'desc' }, take: 50,
    }),
    prisma.announcement.findMany({
      where: { moderationStatus: { in: ['flagged', 'needs_review'] } },
      include: { author: { select: { name: true } }, class: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
  ])

  const items: ModItem[] = [
    ...messages.map((m): ModItem => ({ kind: 'message', id: m.id, Icon: MessagesSquare, who: `${m.sender.name ?? 'User'} (${m.sender.role})`, context: `${m.conversation.type} chat`, body: m.body, category: m.flagCategory, severity: m.flagSeverity, blocked: m.blocked, status: m.flagged ? 'flagged' : 'reviewed', at: m.createdAt, canReportParent: m.blocked && !!m.conversation.parent?.email, reportedToParent: !!m.reportedToParentAt })),
    ...questions.map((q): ModItem => ({ kind: 'question', id: q.id, Icon: MessageCircleQuestion, who: `${q.student.firstName} ${q.student.lastName} (student)`, context: `Question · ${q.class.name}`, body: q.body, category: null, severity: null, blocked: q.blocked, status: q.moderationStatus, at: q.createdAt })),
    ...replies.map((r): ModItem => ({ kind: 'reply', id: r.id, Icon: MessageCircleQuestion, who: `${r.author.name ?? 'User'} (${r.author.role})`, context: `Reply · ${r.question.title.slice(0, 40)}`, body: r.body, category: null, severity: null, blocked: r.blocked, status: r.moderationStatus, at: r.createdAt })),
    ...documents.map((d): ModItem => ({ kind: 'document', id: d.id, Icon: FileText, who: `${d.student.firstName} ${d.student.lastName} (student)`, context: 'School document', body: d.title, category: null, severity: null, blocked: false, status: d.moderationStatus, at: d.uploadedAt })),
    ...announcements.map((a): ModItem => ({ kind: 'announcement', id: a.id, Icon: Megaphone, who: `${a.author.name ?? 'Tutor'} (tutor)`, context: `Announcement · ${a.class.name}`, body: a.body, category: null, severity: null, blocked: false, status: a.moderationStatus, at: a.createdAt })),
  ].sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? -1 : 1
    return b.at.getTime() - a.at.getTime()
  })

  const blockedCount = items.filter((i) => i.blocked).length

  return (
    <AdminShell sub="Moderation">
      <div className="mb-5">
        <h1 className="portal-title flex items-center gap-2"><ShieldAlert size={22} className="text-primary" /> Moderation</h1>
        <p className="portal-lede">All flagged and withheld content across student questions, replies, messages, documents and announcements. {blockedCount > 0 ? `${blockedCount} item${blockedCount === 1 ? '' : 's'} withheld pending review.` : ''}</p>
      </div>

      {items.length === 0 ? (
        <div className="glass-card glass-card-pad text-center">
          <p className="text-sm text-slate-500">Nothing needs review. The learning environment is clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={`${it.kind}:${it.id}`} className="glass-card glass-card-pad">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {it.blocked && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}><Lock size={11} /> Withheld</span>}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}><it.Icon size={11} /> {it.context}</span>
                {it.category && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,.16)', color: '#B45309' }}>{it.category}{it.severity ? ` · ${it.severity}` : ''}</span>}
                <span className="text-[11px] text-slate-400 ml-auto">{fmt(it.at)}</span>
              </div>
              <p className="text-[13px] font-semibold text-dark">{it.who}</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mt-1 mb-3">{it.body.slice(0, 400)}</p>
              <ModerationActions kind={it.kind} id={it.id} canReportParent={it.canReportParent} reportedToParent={it.reportedToParent} />
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
