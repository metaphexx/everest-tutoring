'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Coins, Trash2 } from 'lucide-react'
import { grantCredit, voidCredit } from '../actions'
import { Button } from '@/components/ui/button'

type Credit = { id: string; amountCents: number; originalCents: number; reason: string; status: string; createdAt: string }

const money = (c: number) => `$${(c / 100).toFixed(2)}`

export default function CreditPanel({ studentId, balanceCents, credits, defaultDollars }: { studentId: string; balanceCents: number; credits: Credit[]; defaultDollars: number }) {
  const [amount, setAmount] = useState(String(defaultDollars))
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Coins size={16} className="text-primary" />
        <h2 className="portal-section-title" style={{ margin: 0 }}>Account credit</h2>
        <span className={`ml-auto text-sm font-bold ${balanceCents > 0 ? 'text-green-700' : 'text-slate-400'}`}>{money(balanceCents)} available</span>
      </div>

      <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
        <p className="text-xs text-slate-500 mb-2">Issue credit (e.g. for a missed session). It auto-applies to reduce the family&apos;s next charge.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-slate-500">Amount ($)
            <input type="number" inputMode="decimal" min={0} max={2000} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-24 text-sm rounded-lg px-2.5 py-1.5 mt-0.5" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }} />
          </label>
          <label className="flex-1 min-w-[180px] text-xs text-slate-500">Reason
            <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missed Maths, 12 Aug" className="block w-full text-sm rounded-lg px-2.5 py-1.5 mt-0.5" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }} />
          </label>
          <Button size="sm" disabled={pending || !reason.trim() || !(Number(amount) > 0)}
            onClick={() => start(async () => { const r = await grantCredit({ studentId, amountDollars: Number(amount), reason }); if (r.ok) { setReason(''); setMsg('Credit issued ✓') } else setMsg(r.reason ?? 'Failed') })}>
            {pending ? 'Issuing…' : 'Issue credit'}
          </Button>
          {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
        </div>
      </div>

      {credits.length === 0 ? (
        <p className="text-sm text-slate-400">No credit on this account.</p>
      ) : (
        <div className="space-y-1.5">
          {credits.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,.5)' }}>
              <span className={`font-semibold ${c.status === 'active' ? 'text-green-700' : 'text-slate-400'}`}>{money(c.amountCents)}</span>
              {c.status !== 'active' && <Badge size="sm">{c.status}{c.status === 'applied' ? ` (was ${money(c.originalCents)})` : ''}</Badge>}
              <span className="flex-1 min-w-0 truncate text-slate-600">{c.reason}</span>
              <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
              {c.status === 'active' && (
                <button type="button" title="Void" onClick={() => { if (confirm('Void this credit?')) start(async () => { await voidCredit(c.id, studentId) }) }} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
