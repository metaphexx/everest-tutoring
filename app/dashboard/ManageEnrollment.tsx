'use client'

import { useState, useTransition } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { submitEnrollmentRequest } from '@/app/requests/actions'
import { Button } from '@/components/ui/button'

type Child = { id: string; name: string }

export default function ManageEnrollment({ students }: { students: Child[] }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const [studentId, setStudentId] = useState('')
  const [pending, start] = useTransition()

  if (done) {
    return (
      <div>
        <h3 className="portal-section-title mb-1">Manage enrolment</h3>
        <p className="text-sm text-slate-600">
          Thanks - your message has been sent to our team and we&apos;ll be in touch shortly. Nothing about your enrolment has changed in the meantime.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="portal-section-title mb-0.5">Manage enrolment</h3>
          <p className="text-xs text-slate-500">Change classes, pause, update details, or discuss your options - just send us a message.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <SlidersHorizontal size={15} /> Manage enrollment
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <h3 className="portal-section-title mb-0">Manage enrolment</h3>
      <p className="text-xs text-slate-500">Tell us what you&apos;d like us to do and our team will take care of it.</p>
      {students.length > 1 && (
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}>
          <option value="">All of my children</option>
          {students.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="e.g. change class times, pause for a term, or update contact details…"
        className="w-full text-sm rounded-lg px-3 py-2"
        style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}
      />
      <div className="flex items-center gap-2">
        <Button
          disabled={pending || !message.trim()}
          onClick={() => start(async () => { const r = await submitEnrollmentRequest({ studentId: studentId || undefined, message }); if (r.ok) setDone(true) })}
        >
          {pending ? 'Sending…' : 'Send to admin'}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
    </div>
  )
}
