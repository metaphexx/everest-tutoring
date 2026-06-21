'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { suggestSupportDraft } from '@/app/messages/actions'

export default function SupportSuggest({ conversationId }: { conversationId: string }) {
  const [draft, setDraft] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  function gen() {
    setError('')
    start(async () => {
      const res = await suggestSupportDraft({ conversationId })
      if (!res.ok) { setError(res.error ?? 'Could not draft.'); return }
      setDraft(res.draft ?? '')
      setCategory(res.category ?? '')
    })
  }
  function copy() {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="glass-card glass-card-pad mb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-dark flex items-center gap-1.5"><Sparkles size={15} className="text-primary" /> AI triage</span>
        <button type="button" onClick={gen} disabled={pending} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-60" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}>
          {pending ? 'Drafting…' : 'Suggest reply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {draft && (
        <div className="mt-2.5">
          {category && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>{category}</span>}
          <div className="mt-2 rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(124,92,255,.06)', border: '1px solid rgba(124,92,255,.18)' }}>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">{draft}</p>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary flex-shrink-0">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Review and edit before sending.</p>
        </div>
      )}
    </div>
  )
}
