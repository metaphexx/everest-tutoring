'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Send, Pin, Trash2, GraduationCap, MessageCircleQuestion, Hand, MessageSquare, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { statusMeta } from '@/lib/question-status'
import { postAnnouncement, toggleAnnouncementPin, deleteAnnouncement } from '@/app/tutor/resources/actions'

export type TutorStreamItem = {
  id: string
  kind: 'post' | 'question'
  questionId?: string
  authorName: string
  authorInitials: string
  isTutor: boolean
  mine: boolean
  body: string
  pinned: boolean
  createdAt: string
  title?: string
  status?: string
  replyCount?: number
  reactionCount?: number
}

export default function TutorClassStream({
  classId, items, authorInitials,
}: {
  classId: string
  items: TutorStreamItem[]
  authorInitials: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  const expanded = focused || body.length > 0

  function post() {
    setError('')
    if (body.trim().length < 2) { setError('Write something to share with your class.'); return }
    start(async () => {
      const res = await postAnnouncement({ classId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not post.'); return }
      setBody(''); setFocused(false); setSent(true); router.refresh()
      setTimeout(() => setSent(false), 3000)
    })
  }
  const pin = (id: string) => start(async () => { await toggleAnnouncementPin({ id }); router.refresh() })
  const del = (id: string) => start(async () => { await deleteAnnouncement({ id }); router.refresh() })

  return (
    <div className="space-y-4">
      {/* Announcement composer */}
      <div className="glass-card glass-card-pad">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', fontFamily: 'var(--font-display)' }}>{authorInitials}</span>
          <div className="flex-1 min-w-0">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share an announcement with your class…"
              rows={expanded ? 3 : 1}
              maxLength={2000}
              className="w-full text-sm rounded-2xl px-4 py-2.5 resize-none outline-none transition-all"
              style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }}
            />
            {error && <p className="text-xs text-red-600 mt-1.5" role="alert">{error}</p>}
            {sent && <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mt-1.5" role="status"><Check size={13} /> Posted to your class.</p>}
            <div className="flex items-center mt-2.5">
              <Button onClick={post} disabled={pending} className="ml-auto font-display">
                <Send size={14} /> {pending ? 'Posting…' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stream feed */}
      {items.length === 0 ? (
        <div className="glass-card glass-card-pad text-center">
          <p className="text-sm text-slate-500">Nothing posted yet. Share an announcement to get your class started.</p>
        </div>
      ) : (
        items.map((it) => {
          const tutor = it.isTutor
          const cardStyle = tutor
            ? { background: 'linear-gradient(135deg, rgba(0,157,255,.08), rgba(255,255,255,.5))', border: '1px solid rgba(0,157,255,.28)', borderLeft: '4px solid #009DFF', boxShadow: '0 14px 30px -22px rgba(0,157,255,.6)' }
            : { background: 'rgba(255,255,255,.66)', border: '1px solid rgba(255,255,255,.7)' }
          return (
            <article key={`${it.kind}:${it.id}`} className="glass-card-pad rounded-2xl" style={cardStyle}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: tutor ? 'linear-gradient(135deg,#009dff,#007acc)' : 'linear-gradient(135deg,#7C5CFF,#6D28D9)', fontFamily: 'var(--font-display)' }}>{it.authorInitials}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-dark leading-tight flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                    {it.mine ? 'You' : it.authorName}
                    {tutor && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' }}><GraduationCap size={10} /> Tutor</span>}
                  </p>
                  <p className="text-[11px] text-slate-400">{it.kind === 'question' ? 'asked a question' : tutor ? 'posted an announcement' : 'posted'} · {it.createdAt}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                  {it.pinned && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600"><Pin size={11} /> Pinned</span>}
                  {it.kind === 'post' && (
                    <>
                      <button type="button" onClick={() => pin(it.id)} disabled={pending} aria-label={it.pinned ? 'Unpin' : 'Pin'} title={it.pinned ? 'Unpin' : 'Pin to top'} style={{ color: it.pinned ? '#6D28D9' : '#cbd5e1' }}><Pin size={15} /></button>
                      <button type="button" onClick={() => del(it.id)} disabled={pending} aria-label="Delete" className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
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
                    <Link href={`/tutor/questions?q=${it.questionId}`} className="ml-auto text-primary font-semibold">Answer →</Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{it.body}</p>
              )}
            </article>
          )
        })
      )}
    </div>
  )
}
