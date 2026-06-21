'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw, Check } from 'lucide-react'
import { restoreRecord } from '@/app/admin/trash/actions'

export default function RestoreButton({ entity, id }: { entity: string; id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function doRestore() {
    start(async () => {
      const res = await restoreRecord({ entity, id })
      if (!res.ok) { toast.error(res.error ?? 'Could not restore this record.'); return }
      toast.success('Record restored.')
      router.refresh()
    })
  }

  return (
    <button type="button" disabled={pending} onClick={doRestore} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg min-h-9 w-full sm:w-auto justify-center disabled:opacity-60" style={{ background: 'rgba(34,160,91,.14)', color: '#15803D' }}>
      {pending ? <Check size={12} /> : <RotateCcw size={12} />} {pending ? 'Restoring…' : 'Restore'}
    </button>
  )
}
