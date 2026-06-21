'use client'

import { useState, useTransition } from 'react'
import { setMarketingOptOut } from './actions'

export default function MarketingOptOutToggle({ parentId, optedOut }: { parentId: string; optedOut: boolean }) {
  const [out, setOut] = useState(optedOut)
  const [pending, start] = useTransition()
  return (
    <button
      type="button" disabled={pending}
      onClick={() => start(async () => { const r = await setMarketingOptOut(parentId, !out); if (r.ok) setOut(r.value) })}
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full disabled:opacity-50 ${out ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700'}`}
      title={out ? 'Excluded from win-back marketing' : 'Receives win-back marketing'}
    >
      {out ? 'marketing: off' : 'marketing: on'}
    </button>
  )
}
