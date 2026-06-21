'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Pin, ThumbsUp, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tutorReply, pinReply, setQuestionStatus, suggestAnswer } from '@/app/tutor/questions/actions'

export type TutorReplyItem = {
  id: string; body: string; authorName: string; isTutor: boolean
  helpful: boolean; pinned: boolean; createdAt: string
}

export default function TutorQuestionPanel({
  questionId, status, replies,
}: {
  questionId: string
  status: string
  replies: TutorReplyItem[]
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function send() {
    setError('')
    if (body.trim().length < 2) { setError('Please write a reply.'); return }
    start(async () => {
      const res = await tutorReply({ questionId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not send.'); return }
      setBody('')
      router.refresh()
    })
  }
  function pin(replyId: string) { start(async () => { await pinReply({ replyId }); router.refresh() }) }
  function setStatus(s: string) { start(async () => { await setQuestionStatus({ questionId, status: s }); router.refresh() }) }
  const [suggesting, setSuggesting] = useState(false)
  function suggest() {
    setError(''); setSuggesting(true)
    start(async () => {
      const res = await suggestAnswer({ questionId })
      setSuggesting(false)
      if (!res.ok) { setError(res.error ?? 'Could not draft.'); return }
      setBody(res.text ?? '')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[['solved', 'Mark solved'], ['follow_up_needed', 'Needs follow-up'], ['waiting_for_tutor', 'Reopen']].map(([s, label]) => (
          <Button key={s} variant={status === s ? 'default' : 'secondary'} size="sm" onClick={() => setStatus(s)} disabled={pending || status === s} className="rounded-full">
            {s === 'solved' && <CheckCircle2 size={12} className="inline mr-1" />}
            {label}
          </Button>
        ))}
      </div>

      {replies.length === 0 ? (
        <p className="text-sm text-slate-400">No replies yet. Be the first to answer.</p>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="rounded-2xl p-4" style={r.isTutor ? { background: 'rgba(0,157,255,.06)', border: '1px solid rgba(0,157,255,.16)' } : { background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                {r.isTutor && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' }}><GraduationCap size={11} /> Tutor</span>}
                <span className="text-[13px] font-semibold text-dark">{r.authorName}</span>
                {r.helpful && <span className="inline-flex items-center gap-1 text-[11px] text-green-600"><ThumbsUp size={11} /> Helpful</span>}
                <span className="ml-auto text-[11px] text-slate-400">{r.createdAt}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.body}</p>
              <button type="button" onClick={() => pin(r.id)} disabled={pending} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: r.pinned ? '#6D28D9' : '#94a3b8' }}>
                <Pin size={12} /> {r.pinned ? 'Pinned for class' : 'Pin for class'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write your answer…" maxLength={4000} className="w-full text-sm rounded-xl px-3 py-2 resize-none" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
        {error && <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={12} /> {error}</p>}
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={suggest} disabled={pending} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}>
            <Sparkles size={13} /> {suggesting ? 'Drafting…' : 'Suggest answer'}
          </button>
          <Button onClick={send} disabled={pending} className="ml-auto font-display">
            <Send size={14} /> {pending && !suggesting ? 'Sending…' : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
