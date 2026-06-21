'use client'

import { useState, useTransition } from 'react'
import { setWithdrawalStatus, processWithdrawalRequest } from './actions'

export default function RetentionControls({ id, status }: { id: string; status: string }) {
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Outcome note (optional) - what was discussed, what we offered…"
        className="w-full text-xs rounded-lg px-2.5 py-2"
        style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}
      />
      <div className="flex flex-wrap items-center gap-2">
        {status === 'requested' && (
          <button
            type="button" disabled={pending}
            onClick={() => start(async () => { await setWithdrawalStatus(id, 'discussing', note || undefined); setMsg('Marked as discussing') })}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-sky-700 bg-sky-100 disabled:opacity-50"
          >Mark discussing</button>
        )}
        <button
          type="button" disabled={pending}
          onClick={() => start(async () => { await setWithdrawalStatus(id, 'retained', note || undefined); setMsg('Saved - family retained 🎉') })}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16a34a)' }}
        >Retained (kept them)</button>
        <button
          type="button" disabled={pending}
          onClick={() => { if (!confirm('Process this withdrawal? This ends their enrolment, frees their seat(s) to the waitlist, and stops auto-enrol. This cannot be undone here.')) return; start(async () => { const r = await processWithdrawalRequest(id, note || undefined); setMsg(r.ok ? `Processed · ${'seatsFreed' in r ? r.seatsFreed : 0} seat(s) freed` : 'Failed') }) }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-red-700 bg-red-100 disabled:opacity-50"
        >Process withdrawal</button>
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
