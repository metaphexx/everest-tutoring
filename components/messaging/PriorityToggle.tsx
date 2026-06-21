'use client'

import { useState, useTransition } from 'react'
import { Flag } from 'lucide-react'
import { setConversationPriority } from '@/app/messages/actions'

export default function PriorityToggle({ conversationId, initial }: { conversationId: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [pending, start] = useTransition()
  const toggle = () => {
    const next = !on
    setOn(next)
    start(async () => { const r = await setConversationPriority({ conversationId, value: next }); if (!r.ok) setOn(!next) })
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold disabled:opacity-50"
      style={on ? { background: 'rgba(220,38,38,.12)', color: '#dc2626' } : { background: 'rgba(255,255,255,.6)', color: '#94a3b8', border: '1px solid rgba(15,42,79,.1)' }}
    >
      <Flag size={12} /> {on ? 'Priority' : 'Mark priority'}
    </button>
  )
}
