import Link from 'next/link'
import { Hand, MessageSquare, Lock, Users, Paperclip } from 'lucide-react'
import { statusMeta } from '@/lib/question-status'

export type QuestionCardItem = {
  id: string
  title: string
  status: string
  visibility: string
  askedBy: string
  replyCount: number
  reactionCount: number
  attachmentCount: number
  hasTutorReply: boolean
}

// Compact question card for the boards (class page, home). Links to the detail.
export default function QuestionCard({ q, href }: { q: QuestionCardItem; href?: string }) {
  const meta = statusMeta(q.status)
  return (
    <Link
      href={href ?? `/student/questions/${q.id}`}
      className="block rounded-2xl p-4 transition-colors hover:bg-white/70"
      style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          {q.visibility === 'public_to_class' ? <><Users size={11} /> Class</> : <><Lock size={11} /> Private</>}
        </span>
      </div>
      <p className="text-[14px] font-semibold text-dark leading-snug line-clamp-2">{q.title}</p>
      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
        <span>{q.askedBy}</span>
        {q.reactionCount > 0 && <span className="inline-flex items-center gap-1"><Hand size={11} /> {q.reactionCount}</span>}
        <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {q.replyCount}</span>
        {q.attachmentCount > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={11} /> {q.attachmentCount}</span>}
      </div>
    </Link>
  )
}
