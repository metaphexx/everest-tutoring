'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { offerSeat } from './actions'

export default function OfferSeatButton({ waitlistId }: { waitlistId: string }) {
  const [pending, start] = useTransition()
  const [offered, setOffered] = useState(false)
  if (offered) return <Badge variant="info" size="sm">offer sent ✓</Badge>
  return (
    <button type="button" disabled={pending}
      onClick={() => start(async () => { const r = await offerSeat(waitlistId); if (r.ok) setOffered(true) })}
      className="text-xs font-semibold text-primary disabled:opacity-50">
      {pending ? 'Offering…' : 'Offer seat'}
    </button>
  )
}
