'use client'

import { useState, useTransition } from 'react'
import { claimWaitlistSeat } from '@/app/requests/actions'

export default function ClaimSeatButton({ waitlistId }: { waitlistId: string }) {
  const [pending, start] = useTransition()
  const [held, setHeld] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (held) return <span className="text-xs font-medium text-green-700">Seat held - we&apos;ll be in touch ✓</span>
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await claimWaitlistSeat(waitlistId)
          if (r.ok && 'url' in r && r.url) { window.location.href = r.url; return }
          if (r.ok && 'preview' in r && r.preview) { setHeld(true); return }
          setErr(!r.ok ? r.reason : 'Could not claim')
        })}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#22C55E,#16a34a)' }}
      >
        {pending ? 'Taking you to payment…' : 'Claim & pay'}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  )
}
