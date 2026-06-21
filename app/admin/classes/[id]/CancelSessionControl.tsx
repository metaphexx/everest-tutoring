'use client'

import { useState, useTransition } from 'react'
import { CalendarX } from 'lucide-react'
import { cancelSession } from '../actions'

export default function CancelSessionControl({ subjectId }: { subjectId: string }) {
  const [open, setOpen] = useState(false)
  const [dateLabel, setDateLabel] = useState('')
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const submit = () =>
    start(async () => {
      const r = await cancelSession({ subjectId, dateLabel: dateLabel || 'this week', reason })
      setMsg(r.ok ? `Cancelled - ${r.notified} famil${r.notified === 1 ? 'y' : 'ies'} notified.` : 'Could not cancel.')
      setReason('')
    })

  return (
    <div className="glass-card glass-card-pad">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#dc2626' }}>
        <CalendarX size={16} /> Cancel a session &amp; notify parents
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Which session? e.g. Mon 4 Aug" className="w-full text-sm rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, e.g. tutor unwell)" className="w-full text-sm rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }} />
          {msg && <p className="text-xs font-medium text-primary">{msg}</p>}
          <button type="button" disabled={pending} onClick={submit} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
            {pending ? 'Notifying…' : 'Cancel session & notify'}
          </button>
        </div>
      )}
    </div>
  )
}
