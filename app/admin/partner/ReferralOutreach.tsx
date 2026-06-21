'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Mail, MessageSquare, Send, RefreshCw, Check, ChevronDown } from 'lucide-react'
import { sendOutreach, regenerateOutreach } from './actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  referralId: string
  parentEmail: string | null
  parentPhone: string | null
  status: string | null // drafted | sent | null
  sentAt: string | null
  subject: string
  email: string
  sms: string
}

const field = 'w-full text-sm rounded-lg px-3 py-2'
const fieldStyle = { background: 'rgba(255,255,255,.75)', border: '1px solid rgba(15,42,79,.12)' } as const

export default function ReferralOutreach(props: Props) {
  const sent = props.status === 'sent'
  const hasDraft = !!(props.subject || props.email || props.sms)
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(props.subject)
  const [email, setEmail] = useState(props.email)
  const [sms, setSms] = useState(props.sms)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const canSend = !!props.parentEmail || !!props.parentPhone

  const doSend = () =>
    start(async () => {
      const r = await sendOutreach({ referralId: props.referralId, subject, email, sms })
      const bits: string[] = []
      if (r.emailSent) bits.push('email')
      if (r.smsSent) bits.push('SMS')
      setResult(`${r.status === 'sent' ? 'Sent' : 'Queued (preview mode)'}: ${bits.join(' + ') || 'nothing reachable'}`)
    })

  const doRegen = () =>
    start(async () => {
      await regenerateOutreach(props.referralId)
      setResult('Elliot redrafted the outreach. Reload to see it.')
    })

  return (
    <div className="mt-2.5 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,157,255,.10), rgba(124,92,255,.12))', border: '1px solid rgba(124,92,255,.22)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)' }}>
          <Sparkles size={13} />
        </span>
        <span className="text-sm font-semibold text-dark">Elliot outreach</span>
        {sent ? (
          <Badge variant="success" size="sm"><Check size={11} /> sent{props.sentAt ? ` ${props.sentAt}` : ''}</Badge>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-white/70 text-violet-600">{hasDraft ? 'draft ready' : 'no draft yet'}</span>
        )}
        <ChevronDown size={15} className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !hasDraft && !sent && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-slate-500">No draft yet. Let Elliot write a personalised email and SMS from the referral note.</p>
          <Button variant="violet" disabled={pending} onClick={doRegen}>
            <Sparkles size={14} /> {pending ? 'Drafting…' : 'Generate Elliot draft'}
          </Button>
          {result && <p className="text-xs font-medium text-primary">{result}</p>}
        </div>
      )}

      {open && (hasDraft || sent) && (
        <div className="px-3 pb-3 space-y-2.5">
          {sent ? (
            <p className="text-xs text-slate-500">This outreach was already sent. The wording below is what went out.</p>
          ) : (
            <p className="text-xs text-slate-500">Elliot drafted this from the referral. Edit anything, then send. An unsubscribe / STOP line is added automatically.</p>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1"><Mail size={12} /> Email to {props.parentEmail ?? 'no email on file'}</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={sent} className={`${field} font-medium`} style={fieldStyle} />
            <textarea value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} rows={7} className={`${field} mt-1.5 resize-none leading-relaxed`} style={fieldStyle} />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1"><MessageSquare size={12} /> SMS to {props.parentPhone ?? 'no number on file'}</label>
            <textarea value={sms} onChange={(e) => setSms(e.target.value)} disabled={sent} rows={3} className={`${field} resize-none`} style={fieldStyle} />
            <p className="text-[11px] text-slate-400 mt-0.5">{sms.length} characters</p>
          </div>

          {result && <p className="text-xs font-medium text-primary">{result}</p>}

          {!sent && (
            <div className="flex gap-2">
              <Button variant="violet" className="flex-1" disabled={pending || !canSend} onClick={doSend}>
                <Send size={14} /> {pending ? 'Sending…' : 'Approve & send'}
              </Button>
              <Button variant="secondary" disabled={pending} onClick={doRegen}>
                <RefreshCw size={14} /> Redraft
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
