'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Archive, ArrowUpRight, UserCheck } from 'lucide-react'
import { moderateAction, reportToParent, type ModKind, type ModAction } from './actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ModerationActions({
  kind, id, canReportParent = false, reportedToParent = false,
}: {
  kind: ModKind
  id: string
  canReportParent?: boolean
  reportedToParent?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [reported, setReported] = useState(reportedToParent)
  const [err, setErr] = useState('')

  function run(action: ModAction) {
    start(async () => { await moderateAction({ kind, id, action }); router.refresh() })
  }
  function report() {
    setErr('')
    start(async () => {
      const res = await reportToParent({ messageId: id })
      if (!res.ok) { setErr(res.error ?? 'Could not report.'); return }
      setReported(true)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="success" size="sm" disabled={pending} onClick={() => run('approve')} title="Mark safe: clears the flag and makes it visible">
        <Check size={13} /> Approve
      </Button>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run('resolve')} title="Dismiss from the queue. A withheld message stays withheld">
        <Archive size={13} /> Resolve
      </Button>
      <Button variant="destructive" size="sm" disabled={pending} onClick={() => run('escalate')} title="Open a safeguarding/behaviour Incident and alert the lead">
        <ArrowUpRight size={13} /> Escalate
      </Button>
      {kind === 'message' && canReportParent && (
        reported ? (
          <Badge variant="info" size="sm" className="inline-flex items-center gap-1 px-2.5 py-1.5">
            <UserCheck size={13} /> Parent notified
          </Badge>
        ) : (
          <Button variant="soft" size="sm" disabled={pending} onClick={report} title="Email the parent that a message in their child's chat was withheld">
            <UserCheck size={13} /> Report to parent
          </Button>
        )
      )}
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  )
}
