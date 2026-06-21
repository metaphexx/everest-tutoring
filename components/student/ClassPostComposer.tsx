'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, MessageCircleQuestion, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { postToClass } from '@/app/student/classes/actions'

export default function ClassPostComposer({ classId, authorInitials }: { classId: string; authorInitials: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [focused, setFocused] = useState(false)
  const [result, setResult] = useState<'sent' | 'held' | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  const expanded = focused || body.length > 0

  function post() {
    setError('')
    if (body.trim().length < 2) { setError('Write a little more to share.'); return }
    start(async () => {
      const res = await postToClass({ classId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not post.'); return }
      setResult(res.held ? 'held' : 'sent')
      setBody('')
      setFocused(false)
      router.refresh()
      setTimeout(() => setResult(null), 4000)
    })
  }

  return (
    <div className="glass-card glass-card-pad">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#5E6B7C,#404B5C)', fontFamily: 'var(--font-display)' }}>{authorInitials}</span>
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Share something with your class…"
            rows={expanded ? 3 : 1}
            maxLength={2000}
            className="w-full text-sm rounded-2xl px-4 py-2.5 resize-none outline-none transition-all"
            style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }}
          />
          {error && <p className="text-xs text-red-600 mt-1.5" role="alert">{error}</p>}
          {result === 'sent' && <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mt-1.5" role="status"><Check size={13} /> Posted to your class.</p>}
          {result === 'held' && <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5" role="status"><ShieldCheck size={13} className="text-slate-400" /> Thanks, this may be reviewed by the Everest team before it appears.</p>}
          <div className="flex items-center gap-2 mt-2.5">
            <Link href={`/student/ask?class=${classId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
              <MessageCircleQuestion size={14} /> Ask a question
            </Link>
            <Button onClick={post} disabled={pending} className="ml-auto font-display">
              <Send size={14} /> {pending ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
