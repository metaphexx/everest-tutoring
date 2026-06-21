'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startStudentThread } from '@/app/messages/actions'

export type ClassOption = { subjectId: string; label: string; tutorName: string | null }

const FAST_REPLIES = [
  'Can I get more practice on this?',
  'I don’t understand today’s topic',
  'Can you explain my mistake?',
  'What should I revise before next class?',
  'Can you look at my school worksheet?',
  'Can you check my course outline?',
]

export default function StudentStarters({ classes }: { classes: ClassOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(classes[0]?.subjectId ?? '')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function send() {
    setError('')
    if (!subjectId) { setError('Choose a class.'); return }
    if (body.trim().length < 2) { setError('Write a short message.'); return }
    start(async () => {
      const res = await startStudentThread({ subjectId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not send. Please try again.'); return }
      setBody('')
      setOpen(false)
      if (res.conversationId) router.push(`/student/messages?c=${res.conversationId}`)
      router.refresh()
    })
  }

  if (classes.length === 0) {
    return <p className="text-xs text-slate-400 px-1">You can message a tutor once you are enrolled in a class.</p>
  }

  return (
    <div className="glass-card glass-card-pad">
      {!open ? (
        <Button onClick={() => setOpen(true)} className="w-full font-display">
          <MessageSquarePlus size={16} /> Message a tutor
        </Button>
      ) : (
        <div>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full text-sm rounded-xl px-3 py-2 mb-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>
            {classes.map((c) => <option key={c.subjectId} value={c.subjectId}>{c.label}</option>)}
          </select>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What would you like to ask your tutor?" maxLength={4000} className="w-full text-sm rounded-xl px-3 py-2 resize-none" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {FAST_REPLIES.map((r) => (
              <button key={r} type="button" onClick={() => setBody((b) => (b.trim() ? `${b.trim()} ${r}` : r))} className="text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(0,157,255,.08)', color: '#007ECC' }}>
                {r}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex items-center gap-2 mt-3">
            <Button onClick={send} disabled={pending} className="font-display">
              <Send size={14} /> {pending ? 'Sending…' : 'Send'}
            </Button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
