import Link from 'next/link'
import { GraduationCap, Pin, MessageCircleQuestion, Hand, MessageSquare } from 'lucide-react'
import { statusMeta } from '@/lib/question-status'

export type StreamItem = {
  id: string
  kind: 'post' | 'question'
  authorName: string
  authorInitials: string
  isTutor: boolean
  mine: boolean
  body: string
  pinned: boolean
  createdAt: string
  // question-only
  questionId?: string
  title?: string
  status?: string
  visibility?: string
  replyCount?: number
  reactionCount?: number
}

// The classroom stream: tutor announcements, student posts and shared questions in
// one chronological feed. Tutor posts are visually emphasised.
export default function StreamFeed({ items }: { items: StreamItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass-card glass-card-pad text-center">
        <p className="text-sm text-slate-500">Nothing posted yet. Share something with your class or ask a question to get started.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((it) => <StreamCard key={`${it.kind}:${it.id}`} it={it} />)}
    </div>
  )
}

function StreamCard({ it }: { it: StreamItem }) {
  const tutor = it.isTutor
  const cardStyle = tutor
    ? { background: 'linear-gradient(135deg, rgba(0,157,255,.08), rgba(255,255,255,.5))', border: '1px solid rgba(0,157,255,.28)', borderLeft: '4px solid #009DFF', boxShadow: '0 14px 30px -22px rgba(0,157,255,.6)' }
    : { background: 'rgba(255,255,255,.66)', border: '1px solid rgba(255,255,255,.7)' }

  const inner = (
    <>
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ background: tutor ? 'linear-gradient(135deg,#009dff,#007acc)' : 'linear-gradient(135deg,#7C5CFF,#6D28D9)', fontFamily: 'var(--font-display)' }}
        >
          {it.authorInitials}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-dark leading-tight flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
            {it.mine ? 'You' : it.authorName}
            {tutor && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' }}><GraduationCap size={10} /> Tutor</span>}
          </p>
          <p className="text-[11px] text-slate-400">
            {it.kind === 'question' ? 'asked a question' : tutor ? 'posted an announcement' : 'posted'} · {it.createdAt}
          </p>
        </div>
        {it.pinned && <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 flex-shrink-0"><Pin size={11} /> Pinned</span>}
      </div>

      {it.kind === 'question' ? (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircleQuestion size={14} className="text-primary flex-shrink-0" />
            <span className="text-[14px] font-semibold text-dark leading-snug">{it.title}</span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-2 ml-[22px]">{it.body}</p>
          <div className="flex items-center gap-3 mt-2 ml-[22px] text-[11px] text-slate-400">
            {it.status && (() => { const m = statusMeta(it.status!); return <span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>{m.label}</span> })()}
            {(it.reactionCount ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Hand size={11} /> {it.reactionCount}</span>}
            <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {it.replyCount ?? 0}</span>
            <span className="ml-auto text-primary font-semibold">Open & reply →</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{it.body}</p>
      )}
    </>
  )

  return (
    <article className="glass-card-pad rounded-2xl" style={cardStyle}>
      {it.kind === 'question' && it.questionId ? (
        <Link href={`/student/questions/${it.questionId}`} className="block">{inner}</Link>
      ) : (
        inner
      )}
    </article>
  )
}
