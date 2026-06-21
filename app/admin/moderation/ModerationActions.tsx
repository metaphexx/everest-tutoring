'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Archive, ArrowUpRight, UserCheck } from 'lucide-react'
import { moderateAction, reportToParent, type ModKind, type ModAction } from './actions'

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
      <button type="button" disabled={pending} onClick={() => run('approve')} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60" style={{ background: 'rgba(34,160,91,.12)', color: '#15803D' }}>
        <Check size={13} /> Approve
      </button>
      <button type="button" disabled={pending} onClick={() => run('resolve')} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}>
        <Archive size={13} /> Resolve
      </button>
      <button type="button" disabled={pending} onClick={() => run('escalate')} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60" style={{ background: 'rgba(220,38,38,.1)', color: '#dc2626' }}>
        <ArrowUpRight size={13} /> Escalate
      </button>
      {kind === 'message' && canReportParent && (
        reported ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
            <UserCheck size={13} /> Parent notified
          </span>
        ) : (
          <button type="button" disabled={pending} onClick={report} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
            <UserCheck size={13} /> Report to parent
          </button>
        )
      )}
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  )
}
