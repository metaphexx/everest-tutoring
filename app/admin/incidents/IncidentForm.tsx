'use client'

import { useState, useTransition } from 'react'
import { logIncident } from './actions'

const CATEGORIES = ['safeguarding', 'behaviour', 'injury', 'other']
const SEVERITIES = ['low', 'medium', 'high']
const field = 'w-full text-sm rounded-xl px-3 py-2.5'
const fieldStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' } as const

export default function IncidentForm() {
  const [category, setCategory] = useState('behaviour')
  const [severity, setSeverity] = useState('medium')
  const [studentName, setStudentName] = useState('')
  const [details, setDetails] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)

  const submit = () =>
    start(async () => {
      const r = await logIncident({ studentName, category, severity, details, actionTaken })
      if (r.ok) { setDone(true); setStudentName(''); setDetails(''); setActionTaken(''); setTimeout(() => setDone(false), 2500) }
    })

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field} style={fieldStyle}>{CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}</select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={field} style={fieldStyle}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student (optional)" className={field} style={fieldStyle} />
      </div>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="What happened?" className={`${field} resize-none`} style={fieldStyle} />
      <input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Action taken (optional)" className={field} style={fieldStyle} />
      <button type="button" disabled={pending || !details.trim()} onClick={submit} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
        {pending ? 'Logging…' : done ? 'Logged ✓' : 'Log incident'}
      </button>
    </div>
  )
}
