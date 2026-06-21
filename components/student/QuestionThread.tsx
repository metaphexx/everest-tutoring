'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Hand, ThumbsUp, Pin, Send, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addStudentReply, toggleReaction, markReplyHelpful, setQuestionSolved } from '@/app/student/questions/actions'

export type ReplyItem = {
  id: string
  body: string
  authorName: string
  isTutor: boolean
  mine: boolean
  helpful: boolean
  pinned: boolean
  createdAt: string
}

export default function QuestionThread({
  questionId, isOwner, canReply, status, reactionCount, reacted, replies,
}: {
  questionId: string
  isOwner: boolean
  canReply: boolean
  status: string
  reactionCount: number
  reacted: boolean
  replies: ReplyItem[]
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  const pinned = replies.filter((r) => r.pinned)
  const rest = replies.filter((r) => !r.pinned)

  function react() {
    start(async () => { await toggleReaction({ questionId }); router.refresh() })
  }
  function helpful(replyId: string) {
    start(async () => { await markReplyHelpful({ replyId }); router.refresh() })
  }
  function solved(value: boolean) {
    start(async () => { await setQuestionSolved({ questionId, solved: value }); router.refresh() })
  }
  function send() {
    setError('')
    if (body.trim().length < 2) { setError('Please write a little more.'); return }
    start(async () => {
      const res = await addStudentReply({ questionId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not send.'); return }
      setBody('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Reaction + solved controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={reacted ? 'default' : 'soft'}
          size="sm"
          onClick={react}
          disabled={isOwner || pending}
          className="rounded-full disabled:opacity-70"
          title={isOwner ? 'This is your question' : 'I have this question too'}
        >
          <Hand size={13} /> I have this too{reactionCount > 0 ? ` · ${reactionCount}` : ''}
        </Button>
        {isOwner && (
          status === 'solved' ? (
            <button type="button" onClick={() => solved(false)} disabled={pending} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}>
              <RotateCcw size={13} /> Reopen
            </button>
          ) : (
            <button type="button" onClick={() => solved(true)} disabled={pending} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,160,91,.14)', color: '#15803D' }}>
              <CheckCircle2 size={13} /> Mark solved
            </button>
          )
        )}
      </div>

      {/* Replies */}
      {replies.length === 0 ? (
        <p className="text-sm text-slate-400">No replies yet. Your tutor will answer here.</p>
      ) : (
        <div className="space-y-3">
          {[...pinned, ...rest].map((r) => (
            <div key={r.id} className="rounded-2xl p-4" style={r.isTutor ? { background: 'rgba(0,157,255,.06)', border: '1px solid rgba(0,157,255,.16)' } : { background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                {r.isTutor && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' }}><GraduationCap size={11} /> Tutor</span>}
                <span className="text-[13px] font-semibold text-dark">{r.mine ? 'You' : r.authorName}</span>
                {r.pinned && <span className="inline-flex items-center gap-1 text-[11px] text-violet-600"><Pin size={11} /> Pinned</span>}
                {r.helpful && <span className="inline-flex items-center gap-1 text-[11px] text-green-600"><ThumbsUp size={11} /> Helpful</span>}
                <span className="ml-auto text-[11px] text-slate-400">{r.createdAt}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.body}</p>
              {isOwner && r.isTutor && (
                <button type="button" onClick={() => helpful(r.id)} disabled={pending} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: r.helpful ? '#15803D' : '#94a3b8' }}>
                  <ThumbsUp size={12} /> {r.helpful ? 'Marked helpful' : 'Mark helpful'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply composer: the owner always, classmates on shared questions. */}
      {canReply && (
        <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={isOwner ? 'Add more detail or reply to your tutor…' : 'Help your classmate or add to the discussion…'} maxLength={4000} className="w-full text-sm rounded-xl px-3 py-2 resize-none" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <Button onClick={send} disabled={pending} className="mt-2 font-display">
            <Send size={14} /> {pending ? 'Sending…' : 'Reply'}
          </Button>
        </div>
      )}
    </div>
  )
}
