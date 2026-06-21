'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { claimSeat } from '../actions'

export default function ClaimConfirm({ token, priceLabel }: { token: string; priceLabel: string }) {
  const [pending, start] = useTransition()
  const [preview, setPreview] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (preview) {
    return (
      <div style={{ textAlign: 'center' }}>
        <CheckCircle2 size={44} color="#22C55E" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 700, color: '#00203F', fontSize: '1.05rem' }}>Seat held 🎉</p>
        <p style={{ color: '#475569', fontSize: '.9rem', marginTop: 6 }}>
          Our team will send you a secure payment link to lock it in. Keep an eye on your email and phone.
        </p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await claimSeat(token)
          if (r.ok && 'url' in r && r.url) { window.location.href = r.url; return }
          if (r.ok && 'preview' in r && r.preview) { setPreview(true); return }
          setErr(!r.ok ? r.reason : 'Something went wrong - please try again.')
        })}
        style={{
          width: '100%', padding: '13px 18px', borderRadius: 14, border: 'none', cursor: pending ? 'default' : 'pointer',
          background: 'linear-gradient(135deg,#22C55E,#16a34a)', color: '#fff', fontWeight: 700, fontSize: '.95rem', opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Taking you to payment…' : `Secure my seat - pay ${priceLabel}`}
      </button>
      {err && <p style={{ color: '#dc2626', fontSize: '.85rem', textAlign: 'center', marginTop: 10 }}>{err}</p>}
    </div>
  )
}
