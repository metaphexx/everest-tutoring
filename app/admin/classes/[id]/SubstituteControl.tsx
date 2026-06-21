'use client'

import { useState, useTransition } from 'react'
import { UserCog } from 'lucide-react'
import { assignSubstitute } from '../actions'

export default function SubstituteControl({ subjectId, tutors }: { subjectId: string; tutors: { id: string; name: string | null }[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [dateLabel, setDateLabel] = useState('')
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const inputCls = 'w-full text-sm rounded-lg px-3 py-2'
  const inputStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' } as const

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl text-amber-700 bg-amber-100">
        <UserCog size={15} /> Assign substitute
      </button>
    )
  }

  return (
    <div className="glass-card glass-card-pad" style={{ maxWidth: 460 }}>
      <h3 className="portal-section-title mb-2">Assign a substitute tutor</h3>
      <div className="space-y-2">
        <select value={tutorId} onChange={(e) => { setTutorId(e.target.value); const t = tutors.find((x) => x.id === e.target.value); if (t?.name) setName(t.name) }} className={inputCls} style={inputStyle}>
          <option value="">Choose a tutor (or type a name below)</option>
          {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Substitute name" className={inputCls} style={inputStyle} />
        <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Which session? e.g. Mon 28 Jul" className={inputCls} style={inputStyle} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={inputCls} style={inputStyle} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button type="button" disabled={pending || !name.trim() || !dateLabel.trim()}
          onClick={() => start(async () => { const r = await assignSubstitute({ subjectId, substituteTutorId: tutorId || undefined, substituteName: name, dateLabel, reason }); if (r.ok) { setMsg(`Done - ${r.notified} famil${r.notified === 1 ? 'y' : 'ies'} notified`); setName(''); setDateLabel(''); setReason(''); setTutorId('') } else setMsg('Failed') })}
          className="text-xs font-semibold px-3.5 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
          {pending ? 'Notifying…' : 'Assign & notify families'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-slate-400 hover:text-slate-600">Cancel</button>
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
