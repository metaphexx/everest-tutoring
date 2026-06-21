'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { changeParentEmail } from '../actions'
import { isEmail, LIMITS } from '@/lib/validate'
import { Button } from '@/components/ui/button'

export default function ChangeEmail({ parentId, currentEmail }: { parentId: string; currentEmail: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(currentEmail)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary">
        <Pencil size={11} /> Change login email
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" maxLength={LIMITS.email} className="text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.15)', minWidth: 200 }} />
      <Button size="sm" disabled={pending || !isEmail(email)} onClick={() => start(async () => { const r = await changeParentEmail({ parentId, newEmail: email }); setMsg(r.ok ? 'Updated ✓' : (r.reason ?? 'Failed')); if (r.ok) setOpen(false) })}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <button type="button" onClick={() => { setOpen(false); setEmail(currentEmail) }} className="text-xs text-slate-400">Cancel</button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  )
}
