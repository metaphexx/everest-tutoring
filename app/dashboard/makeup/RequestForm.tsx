'use client'

import { useState, useTransition } from 'react'
import { Repeat, CalendarClock, XCircle, HelpCircle, Check } from 'lucide-react'
import { createServiceRequest } from '@/app/requests/actions'
import { Button } from '@/components/ui/button'

type Student = { id: string; name: string; subjects: string[] }

const TYPES = [
  { key: 'makeup', label: 'Make-up class', Icon: Repeat, hint: 'Catch up a missed class' },
  { key: 'reschedule', label: 'Reschedule', Icon: CalendarClock, hint: 'Move a class to another time' },
  { key: 'cancel', label: 'Cancel / withdraw', Icon: XCircle, hint: 'Stop a class (no refund, credit only)' },
  { key: 'other', label: 'Something else', Icon: HelpCircle, hint: 'Any other request' },
] as const

const inputCls = 'w-full text-sm rounded-xl px-3.5 py-2.5'
const inputStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' } as const

export default function RequestForm({ students }: { students: Student[] }) {
  const [type, setType] = useState<string>('makeup')
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [subjectName, setSubjectName] = useState('')
  const [details, setDetails] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)

  const subjects = students.find((s) => s.id === studentId)?.subjects ?? []
  const showDate = type === 'makeup' || type === 'reschedule'

  const submit = () =>
    start(async () => {
      const r = await createServiceRequest({ type, studentId: studentId || undefined, subjectName: subjectName || undefined, details, preferredDate: preferredDate || undefined })
      if (r.ok) {
        setDone(true)
        setDetails('')
        setPreferredDate('')
      }
    })

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
          <Check size={22} className="text-green-600" strokeWidth={3} />
        </div>
        <p className="font-display font-bold text-dark mb-1">Request submitted</p>
        <p className="text-sm text-slate-500 mb-4">Our team will get back to you. You can track it below.</p>
        <button type="button" onClick={() => setDone(false)} className="text-sm font-semibold text-primary">Make another request</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map(({ key, label, Icon, hint }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className="flex items-start gap-2 p-2.5 rounded-xl text-left transition-colors"
            style={type === key ? { background: 'rgba(0,157,255,.1)', border: '1px solid rgba(0,157,255,.3)' } : { background: 'rgba(255,255,255,.5)', border: '1px solid rgba(15,42,79,.08)' }}
          >
            <Icon size={16} className={type === key ? 'text-primary mt-0.5' : 'text-slate-400 mt-0.5'} />
            <span>
              <span className={`block text-sm font-semibold ${type === key ? 'text-dark' : 'text-slate-600'}`}>{label}</span>
              <span className="block text-[11px] text-slate-400">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {students.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <select value={studentId} onChange={(e) => { setStudentId(e.target.value); setSubjectName('') }} className={inputCls} style={inputStyle}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Any / all subjects</option>
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}

      {showDate && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{type === 'makeup' ? 'Date of missed class' : 'Preferred new date'}</label>
          <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
      )}

      <textarea value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Tell us what you need (e.g. Emma was unwell on Monday and missed Maths)." className={`${inputCls} resize-none`} style={inputStyle} />

      {type === 'cancel' && (
        <p className="text-[11px] text-slate-400">Note: as per our terms, cancellations are handled as account credit or withdrawal - we do not offer refunds.</p>
      )}

      <Button disabled={pending || !details.trim()} onClick={submit} className="w-full">
        {pending ? 'Submitting…' : 'Submit request'}
      </Button>
    </div>
  )
}
