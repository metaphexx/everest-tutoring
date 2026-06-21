'use client'

import { useState, useTransition } from 'react'
import { updateServiceRequest } from '@/app/requests/actions'
import { Button } from '@/components/ui/button'

const STATUSES = ['open', 'approved', 'scheduled', 'declined', 'resolved'] as const
const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  scheduled: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  resolved: 'bg-slate-200 text-slate-600',
}

export default function RequestRow({ id, status, adminNote }: { id: string; status: string; adminNote: string | null }) {
  const [cur, setCur] = useState(status)
  const [note, setNote] = useState(adminNote ?? '')
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  const apply = (next?: string) =>
    start(async () => {
      const s = next ?? cur
      await updateServiceRequest({ id, status: s, adminNote: note })
      setCur(s)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => apply(s)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize disabled:opacity-50 ${cur === s ? STATUS_STYLE[s] : 'bg-white/60 text-slate-500 border border-slate-200'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note back to the parent (optional)"
          className="flex-1 text-sm rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}
        />
        <Button size="sm" disabled={pending} onClick={() => apply()}>
          {pending ? '…' : saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
