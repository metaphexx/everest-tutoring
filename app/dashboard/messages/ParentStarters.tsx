'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquarePlus, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startTutorThread, startSupportThread } from '@/app/messages/actions'

type ClassOption = { value: string; label: string; subjectId: string; studentId: string }

export default function ParentStarters({ classes }: { classes: ClassOption[] }) {
  const [mode, setMode] = useState<null | 'tutor' | 'support'>(null)
  const [sel, setSel] = useState(classes[0]?.value ?? '')
  const [topic, setTopic] = useState('')
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit() {
    if (pending || !body.trim()) return
    if (mode === 'tutor') {
      const opt = classes.find((c) => c.value === sel)
      if (!opt) return
      start(async () => {
        const r = await startTutorThread({ subjectId: opt.subjectId, studentId: opt.studentId, body })
        if (r.conversationId) router.push(`/dashboard/messages?c=${r.conversationId}`)
        setMode(null); setBody('')
      })
    } else if (mode === 'support') {
      start(async () => {
        const r = await startSupportThread({ topic, body })
        if (r.conversationId) router.push(`/dashboard/messages?c=${r.conversationId}`)
        setMode(null); setTopic(''); setBody('')
      })
    }
  }

  return (
    <div className="glass-card glass-card-pad">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode(mode === 'tutor' ? null : 'tutor')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap" style={{ background: mode === 'tutor' ? 'rgba(0,157,255,.12)' : 'rgba(255,255,255,.6)', color: '#007ECC', border: '1px solid rgba(255,255,255,.7)' }}>
          <MessageSquarePlus size={15} className="flex-shrink-0" /> Message a tutor
        </button>
        <button type="button" onClick={() => setMode(mode === 'support' ? null : 'support')} className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap" style={{ background: mode === 'support' ? 'rgba(124,92,255,.12)' : 'rgba(255,255,255,.6)', color: '#6D28D9', border: '1px solid rgba(255,255,255,.7)' }}>
          <LifeBuoy size={15} className="flex-shrink-0" /> Contact support
        </button>
      </div>

      {mode === 'tutor' && (
        <div className="mt-3 space-y-2">
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="w-full text-sm rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }}>
            {classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            {classes.length === 0 && <option>No classes yet</option>}
          </select>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Your message to the tutor…" className="w-full text-sm rounded-xl px-3 py-2.5 resize-none" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }} />
          <Button onClick={submit} disabled={pending || !body.trim() || classes.length === 0} className="w-full">
            {pending ? 'Sending…' : 'Send to tutor'}
          </Button>
        </div>
      )}

      {mode === 'support' && (
        <div className="mt-3 space-y-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. billing, scheduling)" className="w-full text-sm rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="How can we help?" className="w-full text-sm rounded-xl px-3 py-2.5 resize-none" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }} />
          <button type="button" onClick={submit} disabled={pending || !body.trim()} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7C5CFF,#6D28D9)' }}>
            {pending ? 'Sending…' : 'Send to Admin Team'}
          </button>
        </div>
      )}
    </div>
  )
}
