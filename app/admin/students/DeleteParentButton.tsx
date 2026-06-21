'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteParentData } from './actions'

export default function DeleteParentButton({ parentId, parentName }: { parentId: string; parentName: string }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button type="button" disabled={pending} onClick={() => start(async () => { await deleteParentData(parentId) })} className="text-[11px] px-2 py-1 rounded-md font-semibold bg-red-600 text-white disabled:opacity-50">
          {pending ? 'Erasing…' : 'Confirm erase'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-400">cancel</button>
      </span>
    )
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} title={`Erase ${parentName} and all their data (Privacy Act)`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600">
      <Trash2 size={14} /> Erase
    </button>
  )
}
