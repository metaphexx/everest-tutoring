'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  CalendarPlus, Repeat, MessagesSquare, MessageCircle, RefreshCw,
  Phone, Mail, X, ShieldCheck, CheckCircle2, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { setAutoReenrol } from '@/app/requests/actions'
import { Button } from '@/components/ui/button'

const PHONE = '0404604673'
const EMAIL = 'info@everesttutoring.com.au'

export default function QuickActions({ autoReenrol, hasBooking }: { autoReenrol: boolean; hasBooking: boolean }) {
  const [on, setOn] = useState(autoReenrol)
  // Only show a status pill once it deviates from the default (or the parent has
  // toggled it this session) - so a quiet default-on draws no attention, but an
  // off state, or any flip, is clearly flagged. Alternates red/green on each swap.
  const [touched, setTouched] = useState(!autoReenrol)
  const [modal, setModal] = useState<null | 'nextterm' | 'contact'>(null)
  // Friction ladder for turning auto-enrolment OFF: 0 = status, 1 = retention, 2 = final confirm.
  const [offStep, setOffStep] = useState(0)
  const [pending, start] = useTransition()

  const close = () => { setModal(null); setOffStep(0) }

  // Escape closes the modal.
  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  const turnOn = () => {
    setOn(true); setTouched(true)
    start(async () => { const r = await setAutoReenrol(true); if (!r.ok) setOn(false) })
    close()
  }
  const turnOff = () => {
    setOn(false); setTouched(true)
    start(async () => { const r = await setAutoReenrol(false); if (!r.ok) setOn(true) })
    close()
  }

  return (
    <div className="glass-card glass-card-pad">
      <h3 className="portal-section-title mb-3">Quick actions</h3>
      <div className="space-y-1">
        <Row href="/dashboard/messages" Icon={MessagesSquare} label="Messages" />
        <Row href="/book" Icon={CalendarPlus} label="Enrol another student" />
        <Row href="/dashboard/makeup" Icon={Repeat} label="Make-up, reschedule or cancel" />
        {hasBooking && (
          <button
            type="button"
            onClick={() => { setOffStep(0); setModal('nextterm') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark hover:bg-white/60 transition-colors text-left"
          >
            <RefreshCw size={16} className="text-primary" />
            <span className="flex-1">Next term enrolment</span>
            {touched && (
              <Badge size="sm" variant={on ? 'success' : 'danger'}>
                {on ? 'On' : 'Off'}
              </Badge>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setModal('contact')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark hover:bg-white/60 transition-colors text-left"
        >
          <MessageCircle size={16} className="text-primary" />
          <span className="flex-1">Contact us</span>
        </button>
      </div>

      {/* Portalled to body: the glass cards use backdrop-filter, which would
          otherwise trap a position:fixed overlay inside the card. The modal only
          opens on a client click, so it never renders during SSR. */}
      <Dialog open={!!modal} onClose={close}>
        {modal === 'contact' && <ContactBody onClose={close} />}
        {modal === 'nextterm' && (
          on
            ? <NextTermOn step={offStep} setStep={setOffStep} onKeep={close} onTurnOff={turnOff} pending={pending} />
            : <NextTermOff onTurnOn={turnOn} onClose={close} pending={pending} />
        )}
      </Dialog>
    </div>
  )
}

function Row({ href, Icon, label }: { href: string; Icon: typeof MessagesSquare; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark hover:bg-white/60 transition-colors">
      <Icon size={16} className="text-primary" />
      {label}
    </Link>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h4 className="font-display font-bold text-dark text-lg">{title}</h4>
      <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition-colors">
        <X size={18} />
      </button>
    </div>
  )
}

/* ── Contact us ─────────────────────────────────────────── */
function ContactBody({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalHeader title="Contact Everest" onClose={onClose} />
      <div className="px-5 pb-5 space-y-3">
        <p className="text-sm text-slate-500">We usually reply the same day. Pick whatever is easiest.</p>

        <Link
          href="/dashboard/messages"
          onClick={onClose}
          className="flex items-center gap-3 p-3.5 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg,#009dff,#007acc)' }}
        >
          <MessagesSquare size={18} />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Send us a message</span>
            <span className="block text-xs text-white/80">Chat in your parent portal - replies land here.</span>
          </span>
          <ChevronRight size={16} />
        </Link>

        <a href={`tel:${PHONE}`} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <span className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--brand-50,#E6F6FF)', color: 'var(--brand-600,#007ECC)' }}><Phone size={16} /></span>
          <span className="flex-1">
            <span className="block text-xs text-slate-400">Call us</span>
            <span className="block text-sm font-semibold text-dark">{PHONE}</span>
          </span>
        </a>

        <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <span className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--brand-50,#E6F6FF)', color: 'var(--brand-600,#007ECC)' }}><Mail size={16} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs text-slate-400">Email us</span>
            <span className="block text-sm font-semibold text-dark truncate">{EMAIL}</span>
          </span>
        </a>
      </div>
    </>
  )
}

/* ── Next term: currently OFF (easy to turn back on) ────── */
function NextTermOff({ onTurnOn, onClose, pending }: { onTurnOn: () => void; onClose: () => void; pending: boolean }) {
  return (
    <>
      <ModalHeader title="Next term enrolment" onClose={onClose} />
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)' }}>
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">Auto-enrolment is <b className="text-dark">off</b>. Your child&apos;s spot for next term isn&apos;t reserved, and you&apos;ll need to re-book manually each term.</p>
        </div>
        <Button onClick={onTurnOn} disabled={pending} className="w-full rounded-full">
          Turn on auto-enrolment
        </Button>
        <p className="text-xs text-slate-400 text-center">Keeps your child&apos;s spot and locks in this term&apos;s price. We always send a reminder before any charge.</p>
      </div>
    </>
  )
}

/* ── Next term: currently ON (friction to turn off) ─────── */
function NextTermOn({ step, setStep, onKeep, onTurnOff, pending }: {
  step: number; setStep: (n: number) => void; onKeep: () => void; onTurnOff: () => void; pending: boolean
}) {
  if (step === 0) {
    return (
      <>
        <ModalHeader title="Next term enrolment" onClose={onKeep} />
        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.25)' }}>
            <CheckCircle2 size={18} className="text-green-600" />
            <p className="text-sm font-semibold text-dark">Auto-enrolment is on - you&apos;re all set.</p>
          </div>
          <ul className="space-y-2">
            {[
              'Your child keeps the exact same class and spot, with no scramble.',
              'This term’s price is locked in - even if fees rise.',
              'No forms to re-do each term. We handle the rebooking.',
              'We always email a reminder before any charge - cancel anytime.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-slate-600">
                <ShieldCheck size={15} className="text-primary flex-shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
          <Button onClick={onKeep} className="w-full rounded-full">
            Great, keep it on
          </Button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Turn off auto-enrolment
          </button>
        </div>
      </>
    )
  }
  if (step === 1) {
    return (
      <>
        <ModalHeader title="Before you turn it off" onClose={onKeep} />
        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-slate-600">Most Everest families keep auto-enrolment on so their child never loses their place. A few things to know first:</p>
          <ul className="space-y-2">
            {[
              'Spots fill fast - if you opt out, we can’t guarantee the same class or time next term.',
              'You’d re-book manually, and next term’s price may be higher.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-slate-600">
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid var(--border-subtle,#DDE4EC)' }}>
            <p className="text-xs font-semibold text-dark mb-1.5">Just need a change instead?</p>
            <p className="text-xs text-slate-500">If it&apos;s about cost, timing or a break, message us - we can often pause, reschedule or adjust your plan instead of stopping.</p>
            <Link href="/dashboard/messages" onClick={onKeep} className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2">
              Message the team <ChevronRight size={13} />
            </Link>
          </div>
          <Button onClick={onKeep} className="w-full rounded-full">
            Keep my spot (recommended)
          </Button>
          <button type="button" onClick={() => setStep(2)} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Continue to turn off
          </button>
        </div>
      </>
    )
  }
  return (
    <>
      <ModalHeader title="Turn off auto-enrolment?" onClose={onKeep} />
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)' }}>
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">This is your last step. We&apos;ll <b className="text-dark">release your child&apos;s spot</b> at the end of term and you&apos;ll need to re-book - subject to availability and the new term&apos;s pricing.</p>
        </div>
        <Button onClick={onKeep} className="w-full rounded-full">
          Keep auto-enrolment
        </Button>
        <button
          type="button"
          onClick={onTurnOff}
          disabled={pending}
          className="w-full py-2.5 rounded-full text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          Yes, turn it off
        </button>
      </div>
    </>
  )
}
