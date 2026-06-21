'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { sendWaitlistBlast } from './actions'
import { Button } from '@/components/ui/button'
import type { BroadcastChannel } from '@/lib/broadcast'

export default function WaitlistComposer({ reachable }: { reachable: number }) {
  const [channel, setChannel] = useState<BroadcastChannel>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-1">Message the waitlist</h2>
      <p className="text-xs text-slate-500 mb-3">Reaches {reachable} reachable waitlisted famil{reachable === 1 ? 'y' : 'ies'} (excludes marketing opt-outs). Channels respect STOP/unsubscribe.</p>

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
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="e.g. new class times opening up, a second class being added…"
        className="w-full text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }} />
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" disabled={pending || !body.trim() || (channel !== 'sms' && !subject.trim())}
          onClick={() => start(async () => { const r = await sendWaitlistBlast({ channel, subject, body }); setMsg(r.text) })}>
          <Send size={13} /> {pending ? 'Sending…' : 'Send to waitlist'}
        </Button>
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
