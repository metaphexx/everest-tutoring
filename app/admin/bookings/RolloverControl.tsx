'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Bell } from 'lucide-react'
import { runTermRollover } from './actions'

export default function RolloverControl() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const run = (mode: 'remind' | 'charge') =>
    start(async () => {
      const r = await runTermRollover(mode)
      if (mode === 'remind') setMsg(`Reminders ${r.live ? 'sent' : 'queued (preview)'}: ${r.reminded} famil${r.reminded === 1 ? 'y' : 'ies'} for ${r.term || 'next term'}.`)
      else setMsg(`${r.term || 'Next term'} rollover: ${r.charged + r.preview} rolled over${r.failed ? `, ${r.failed} failed` : ''}${r.live ? '' : ' (preview, no charge)'}.`)
    })

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run('remind')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.1)', color: '#475569' }}>
          <Bell size={13} /> Send rollover reminders
        </button>
        <button type="button" disabled={pending} onClick={() => run('charge')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7C5CFF,#6D28D9)' }}>
          <RefreshCw size={13} /> {pending ? 'Running…' : 'Run term rollover'}
        </button>
      </div>
      {msg && <p className="text-xs font-medium text-primary">{msg}</p>}
    </div>
  )
}
