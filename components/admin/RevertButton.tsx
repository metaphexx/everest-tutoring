'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Undo2, Check } from 'lucide-react'
import { revertAudit } from '@/app/admin/audit/actions'

export default function RevertButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function doRevert() {
    start(async () => {
      const res = await revertAudit({ id })
      if (!res.ok) { toast.error(res.error ?? 'Could not undo this change.'); setConfirming(false); return }
      toast.success('Change undone.')
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg min-h-9" style={{ background: 'rgba(15,42,79,.06)', color: '#5E6B7C' }}>
        <Undo2 size={12} /> Undo
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" disabled={pending} onClick={doRevert} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg min-h-9 disabled:opacity-60" style={{ background: 'rgba(34,160,91,.14)', color: '#15803D' }}>
        <Check size={12} /> {pending ? 'Reverting…' : 'Confirm'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-500 px-1.5 min-h-9">Cancel</button>
    </span>
  )
}
