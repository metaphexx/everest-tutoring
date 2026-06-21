'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { sendWinback } from './actions'
import type { BroadcastChannel } from '@/lib/broadcast'

const PRESETS = [
  { label: 'New term enrolments open', subject: 'A spot for your child at Everest next term',
    body: "Hi, it's the team at Everest Tutoring. Enrolments for next term are open and we'd love to welcome your family back. Small classes (max 12), aligned to the Harrisdale SHS course outlines. Reply or book at everesttutoring.com.au - we've kept your details on file." },
  { label: 'We miss you / come back offer', subject: 'We saved your child a seat',
    body: "Hi, we noticed it's been a while since your child was in class with us. A lot has changed and we'd love to have them back. Get in touch and we'll find the right class and time for them." },
]

export default function WinbackComposer({ reachable }: { reachable: number }) {
  const [channel, setChannel] = useState<BroadcastChannel>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-1">Win-back campaign</h2>
      <p className="text-xs text-slate-500 mb-3">Goes to {reachable} reachable alumni (excludes anyone who opted out of marketing). Channels respect STOP/unsubscribe.</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setSubject(p.subject); setBody(p.body) }}
            className="text-xs font-medium px-2.5 py-1 rounded-lg text-slate-600" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-2">
        {(['email', 'sms', 'both'] as BroadcastChannel[]).map((c) => (
          <button key={c} type="button" onClick={() => setChannel(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${channel === c ? 'text-white' : 'text-slate-600'}`}
            style={channel === c ? { background: 'linear-gradient(135deg,#009dff,#007acc)' } : { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}>
            {c === 'both' ? 'Email + SMS' : c.toUpperCase()}
          </button>
        ))}
      </div>

      {channel !== 'sms' && (
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject"
          className="w-full text-sm rounded-lg px-3 py-2 mb-2" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }} />
      )}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message…"
        className="w-full text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }} />

      <div className="flex items-center gap-2 mt-2">
        <button type="button" disabled={pending || !body.trim() || (channel !== 'sms' && !subject.trim())}
          onClick={() => start(async () => { const r = await sendWinback({ channel, subject, body }); setMsg(r.text) })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16a34a)' }}>
          <Send size={13} /> {pending ? 'Sending…' : 'Send win-back'}
        </button>
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
