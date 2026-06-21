'use client'

import { useState, useTransition } from 'react'
import { releaseFlag } from '@/app/messages/actions'

export default function ReleaseFlagButton({ messageId }: { messageId: string }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  if (done) return <span className="text-[11px] font-medium text-green-700">released ✓</span>
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { const r = await releaseFlag({ messageId }); if (r.ok) setDone(true) })}
      className="text-[11px] font-semibold underline underline-offset-2 disabled:opacity-50"
      style={{ color: '#16a34a' }}
      title="This message is fine - clear the AI flag"
    >
      {pending ? 'Releasing…' : 'Release'}
    </button>
  )
}
