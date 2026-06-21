'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Copy, Check, AlertTriangle } from 'lucide-react'
import { draftWinBackForFamily } from './risk-actions'
import { Button } from '@/components/ui/button'
import type { FamilyRisk } from '@/lib/retention-score'

const BAND: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High risk', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
  medium: { label: 'Watch', color: '#B45309', bg: 'rgba(245,166,35,.16)' },
  low: { label: 'Low', color: '#15803D', bg: 'rgba(34,160,91,.14)' },
}

export default function AtRiskList({ families }: { families: FamilyRisk[] }) {
  if (families.length === 0) {
    return <p className="text-sm text-slate-400">No at-risk families right now. Everyone looks settled.</p>
  }
  return (
    <div className="space-y-3">
      {families.map((f) => <RiskCard key={f.parentId} f={f} />)}
    </div>
  )
}

function RiskCard({ f }: { f: FamilyRisk }) {
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const band = BAND[f.band]

  function gen() {
    setError('')
    start(async () => {
      const res = await draftWinBackForFamily({ parentName: f.parentName, students: f.students, reasons: f.reasons })
      if (!res.ok) { setError(res.error ?? 'Could not draft.'); return }
      setDraft(res.text ?? '')
    })
  }
  function copy() {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{f.parentName}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: band.bg, color: band.color }}>{band.label} · {f.score}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{f.students.join(', ')}{f.ltvCents > 0 ? ` · $${(f.ltvCents / 100).toLocaleString('en-AU')} lifetime` : ''}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {f.reasons.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(15,42,79,.05)', color: '#5E6B7C' }}><AlertTriangle size={10} /> {r}</span>
            ))}
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={gen} disabled={pending} className="flex-shrink-0">
          <Sparkles size={13} /> {pending ? 'Drafting…' : 'Draft win-back'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {draft && (
        <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(124,92,255,.06)', border: '1px solid rgba(124,92,255,.18)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold" style={{ color: '#6D28D9' }}>Suggested win-back (review before sending)</span>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{draft}</p>
        </div>
      )}
    </div>
  )
}
