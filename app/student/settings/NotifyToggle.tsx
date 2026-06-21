'use client'

import { useState, useTransition } from 'react'
import { setEmailUpdates } from './actions'

export default function NotifyToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn)
  const [pending, start] = useTransition()
  function toggle() {
    const next = !on
    setOn(next)
    start(async () => { await setEmailUpdates({ on: next }) })
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={toggle}
      className="relative inline-flex items-center rounded-full transition-colors"
      style={{ width: 44, height: 26, background: on ? 'linear-gradient(135deg,#009dff,#007acc)' : 'rgba(15,42,79,.18)' }}
    >
      <span className="absolute rounded-full bg-white transition-all" style={{ width: 20, height: 20, top: 3, left: on ? 21 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  )
}
