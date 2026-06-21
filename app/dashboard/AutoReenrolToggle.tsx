'use client'

import { useState, useTransition } from 'react'
import { setAutoReenrol } from '@/app/requests/actions'

export default function AutoReenrolToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [pending, start] = useTransition()

  const toggle = () => {
    const next = !on
    setOn(next)
    start(async () => {
      const r = await setAutoReenrol(next)
      if (!r.ok) setOn(!next)
    })
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-dark">Auto-enrol next term</p>
        <p className="text-xs text-slate-500">{on ? "We'll reserve your spot and enrol automatically next term (with a reminder first)." : 'Off - you\'ll need to re-book manually each term.'}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Auto-enrol next term"
        disabled={pending}
        onClick={toggle}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-60"
        style={{ background: on ? '#16a34a' : '#cbd5e1' }}
      >
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(20px)' : 'none' }} />
      </button>
    </div>
  )
}
