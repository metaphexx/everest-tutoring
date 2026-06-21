'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setReferralStatus } from '@/app/partner/actions'

const STATUSES = ['new', 'contacted', 'enrolled', 'declined']

export default function ReferralStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => start(async () => { await setReferralStatus({ id, status: e.target.value }); router.refresh() })}
      className="text-xs font-semibold rounded-lg px-2.5 py-1.5 capitalize"
      style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}
