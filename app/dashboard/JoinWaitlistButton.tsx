'use client'

import { useState, useTransition } from 'react'
import { joinWaitlist } from '@/app/requests/actions'
import { Button } from '@/components/ui/button'

export default function JoinWaitlistButton({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const [pending, start] = useTransition()
  const [joined, setJoined] = useState(false)
  if (joined) return <span className="text-xs font-medium text-green-700">On the waitlist ✓</span>
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { const r = await joinWaitlist({ subjectId, studentId }); if (r.ok) setJoined(true) })}
    >
      {pending ? 'Joining…' : 'Join waitlist'}
    </Button>
  )
}
