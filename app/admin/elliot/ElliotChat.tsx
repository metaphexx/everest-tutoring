'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Sparkles, Send, Mail, MessageSquare, Check, X, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { askElliot, confirmBroadcast, confirmNote } from './actions'
import type { ElliotAction } from '@/lib/elliot'

type Turn = { role: 'user' | 'assistant'; content: string; action?: ElliotAction; actionDone?: 'sent' | 'cancelled' }

const SUGGESTIONS = [
  'How is attendance tracking this term?',
  'Is anyone flagged for absences?',
  'Email all parents that classes resume Monday',
  'Text Year 9 parents a reminder about the test',
]

export default function ElliotChat({ live, initialQuery }: { live: boolean; initialQuery?: string }) {
  const [messages, setMessages] = useState<Turn[]>([
    {
      role: 'assistant',
      content: live
        ? "Hi, I'm Elliot. Ask me about your students, attendance or communications - or tell me to email or text parents and I'll draft it for your approval."
        : "Hi, I'm Elliot, your CRM assistant. I answer from your live data and can draft emails or texts to parents for you to confirm. Add an ANTHROPIC_API_KEY to switch on full reasoning.",
    },
  ])
  const [input, setInput] = useState('')
  const [pending, start] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  // Auto-run a query passed in from the global "Ask Elliot" command bar.
  const ranInitial = useRef(false)
  useEffect(() => {
    if (initialQuery && !ranInitial.current) {
      ranInitial.current = true
      send(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    const next: Turn[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    start(async () => {
      try {
        const { text: reply, action } = await askElliot(next)
        setMessages((m) => [...m, { role: 'assistant', content: reply, action }])
      } catch {
        setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, something went wrong reaching me just now.' }])
      }
    })
  }

  function confirmAction(idx: number) {
    const a = messages[idx]?.action
    if (!a || pending) return
    start(async () => {
      const r = a.kind === 'broadcast'
        ? await confirmBroadcast({ audienceKey: a.audienceKey, channel: a.channel, subject: a.subject, body: a.body })
        : await confirmNote({ studentId: a.studentId, body: a.body, category: a.category, studentName: a.studentName })
      setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, actionDone: 'sent' as const } : msg)).concat([{ role: 'assistant', content: r.text }]))
    })
  }
  function cancelAction(idx: number) {
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, actionDone: 'cancelled' as const } : msg)).concat([{ role: 'assistant', content: "No worries, I won't do that." }]))
  }

  return (
    <div className="glass-card flex flex-col" style={{ height: 'min(640px, 72vh)' }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)' }}>
                  <Sparkles size={15} />
                </div>
              )}
              <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap" style={m.role === 'user' ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { background: 'rgba(255,255,255,.75)', color: '#182030', border: '1px solid rgba(255,255,255,.7)' }}>
                {m.content}
              </div>
            </div>

            {/* Draft action card */}
            {m.action && (
              <div className="ml-11 mt-2 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(0,157,255,.1), rgba(124,92,255,.12))', border: '1px solid rgba(124,92,255,.25)' }}>
                {m.action.kind === 'broadcast' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      {m.action.channel === 'sms' ? <MessageSquare size={14} className="text-primary" /> : <Mail size={14} className="text-primary" />}
                      <span className="text-xs font-bold text-dark">Draft {m.action.channel === 'both' ? 'email + SMS' : m.action.channel} · {m.action.audienceLabel}</span>
                      <span className="ml-auto text-[11px] text-slate-500">{m.action.recipientCount} recipient{m.action.recipientCount === 1 ? '' : 's'}</span>
                    </div>
                    {m.action.channel !== 'sms' && <p className="text-xs font-semibold text-slate-700 mb-1">Subject: {m.action.subject}</p>}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,.6)' }}>{m.action.body}</p>
                    {m.action.recipientSample.length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-1.5">To: {m.action.recipientSample.join(', ')}{m.action.recipientCount > m.action.recipientSample.length ? `, +${m.action.recipientCount - m.action.recipientSample.length} more` : ''}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <NotebookPen size={14} className="text-primary" />
                      <span className="text-xs font-bold text-dark">Draft note · {m.action.studentName}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,.6)' }}>{m.action.body}</p>
                  </>
                )}
                {!m.actionDone ? (
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => confirmAction(i)} disabled={pending || (m.action.kind === 'broadcast' && m.action.recipientCount === 0)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                      <Check size={15} /> {m.action.kind === 'note' ? 'Save note' : 'Send'}
                    </button>
                    <button type="button" onClick={() => cancelAction(i)} disabled={pending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', color: '#475569', border: '1px solid rgba(15,42,79,.1)' }}>
                      <X size={15} /> Cancel
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs font-semibold mt-2 ${m.actionDone === 'sent' ? 'text-green-600' : 'text-slate-400'}`}>{m.actionDone === 'sent' ? '✓ Confirmed' : 'Cancelled'}</p>
                )}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)' }}>
              <Sparkles size={15} />
            </div>
            <div className="px-4 py-2.5 rounded-2xl text-sm text-slate-400" style={{ background: 'rgba(255,255,255,.7)' }}>Elliot is working…</div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="secondary" size="sm" onClick={() => send(s)} className="rounded-full font-medium">
              {s}
            </Button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(15,42,79,.08)' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Elliot, or tell it to message parents…" className="flex-1 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }} />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} className="w-10 h-10 rounded-xl flex-shrink-0" aria-label="Send">
          <Send size={17} />
        </Button>
      </form>
    </div>
  )
}
