'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { Lock, Check } from 'lucide-react'
import { joinWaitlistFromBooking } from './actions'
import { Button } from '@/components/ui/button'
import { isEmail, isPhone, sanitizeNameInput, sanitizePhoneInput, LIMITS } from '@/lib/validate'

export default function WaitlistRow({ year, subject, day, room }: { year: number; subject: string; day: string; room: string }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const field: CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(15,42,79,.15)', fontSize: '.85rem', background: '#fff' }

  return (
    <div style={{ border: '1px dashed rgba(15,42,79,.2)', borderRadius: 16, padding: '14px 16px', background: 'rgba(148,163,184,.06)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(148,163,184,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
          <Lock size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#334155' }}>{subject} <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 8px', borderRadius: 999, marginLeft: 6 }}>CLASS FULL</span></div>
          <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>{day} 3:15–4:15pm · Room {room}</div>
        </div>
        {!done && !open && (
          <button type="button" onClick={() => setOpen(true)} style={{ fontSize: '.8rem', fontWeight: 700, color: '#009dff', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Join waitlist →
          </button>
        )}
        {done && <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> On the waitlist</span>}
      </div>

      {open && !done && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <p style={{ fontSize: '.8rem', color: '#475569', margin: 0 }}>This class is full, but join the waitlist and we&apos;ll message you the moment a seat opens - first to pay secures it.</p>
          <input style={field} placeholder="Student's name" value={studentName} maxLength={LIMITS.name} onChange={(e) => setStudentName(sanitizeNameInput(e.target.value))} />
          <input style={field} placeholder="Parent/guardian name" value={parentName} maxLength={LIMITS.name} onChange={(e) => setParentName(sanitizeNameInput(e.target.value))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input style={field} type="email" inputMode="email" placeholder="Email" value={email} maxLength={LIMITS.email} onChange={(e) => setEmail(e.target.value)} />
            <input style={field} type="tel" inputMode="tel" placeholder="Mobile" value={phone} maxLength={LIMITS.phone} onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))} />
          </div>
          {!!email && !isEmail(email) && <p style={{ fontSize: '.74rem', color: '#dc2626', margin: 0 }}>Enter a valid email address.</p>}
          {!!phone && !isPhone(phone) && <p style={{ fontSize: '.74rem', color: '#dc2626', margin: 0 }}>Enter a valid Australian number.</p>}
          {err && <p style={{ fontSize: '.78rem', color: '#dc2626', margin: 0 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="sm"
              disabled={pending || !studentName.trim() || !isEmail(email) || !isPhone(phone)}
              onClick={() => start(async () => { const r = await joinWaitlistFromBooking({ year, subject, studentName, parentName, email, phone }); if (r.ok) setDone(true); else setErr(r.reason) })}
            >
              {pending ? 'Joining…' : 'Join the waitlist'}
            </Button>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: 'none', color: '#94a3b8', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
