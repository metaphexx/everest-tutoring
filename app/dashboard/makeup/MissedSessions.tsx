'use client'

import { useState, useTransition } from 'react'
import { CalendarX, CalendarCheck, Coins } from 'lucide-react'
import { reportMiss, bookMakeupClass } from './actions'
import { Button } from '@/components/ui/button'

type Student = { id: string; name: string; subjects: string[] }
type MakeupClass = { id: string; name: string; day: string; startTime: string; endTime: string }
type Miss = {
  id: string; studentName: string; missedSubject: string; missedDateLabel: string
  status: string; makeupSubject?: string | null; makeupDateLabel?: string | null
  available: MakeupClass[]
}

const inputCls = 'w-full text-sm rounded-lg px-3 py-2'
const inputStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' } as const

function ReportForm({ students }: { students: Student[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const subjects = students.find((s) => s.id === studentId)?.subjects ?? []

  return (
    <div>
      <h2 className="portal-section-title mb-1">Let us know about a missed session</h2>
      <p className="text-xs text-slate-500 mb-3">Tell us in advance and you can book a make-up in another class this term - or it becomes account credit toward next term.</p>
      <div className="space-y-2">
        {students.length > 1 && (
          <select value={studentId} onChange={(e) => { setStudentId(e.target.value); setSubject('') }} className={inputCls} style={inputStyle}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="">Which class will they miss?</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={date} maxLength={40} onChange={(e) => setDate(e.target.value)} placeholder="Which week/date? e.g. Mon 4 Aug" className={inputCls} style={inputStyle} />
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Anything else? (optional)" className={inputCls} style={inputStyle} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" disabled={pending || !studentId || !subject || !date.trim()}
          onClick={() => start(async () => { const r = await reportMiss({ studentId, missedSubject: subject, missedDateLabel: date, note }); setMsg(r.ok ? 'Thanks - logged ✓' : (r.reason ?? 'Failed')); if (r.ok) { setDate(''); setNote(''); setSubject('') } })}>
          {pending ? 'Sending…' : 'Report missed session'}
        </Button>
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}

function MissCard({ miss }: { miss: Miss }) {
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  if (miss.status === 'booked') {
    return (
      <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,.07)' }}>
        <p className="text-sm font-medium text-dark flex items-center gap-1.5"><CalendarCheck size={14} className="text-green-600" /> Make-up booked</p>
        <p className="text-xs text-slate-500 mt-0.5">{miss.studentName}: missed {miss.missedSubject} ({miss.missedDateLabel}) → {miss.makeupSubject} on {miss.makeupDateLabel}</p>
      </div>
    )
  }
  if (miss.status === 'credited') {
    return (
      <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,.08)' }}>
        <p className="text-sm font-medium text-dark flex items-center gap-1.5"><Coins size={14} className="text-amber-600" /> Converted to credit</p>
        <p className="text-xs text-slate-500 mt-0.5">{miss.studentName}: missed {miss.missedSubject} ({miss.missedDateLabel}) - applied to your next-term charge.</p>
      </div>
    )
  }
  // open
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.55)' }}>
      <p className="text-sm font-medium text-dark flex items-center gap-1.5"><CalendarX size={14} className="text-slate-500" /> {miss.studentName}: {miss.missedSubject} · {miss.missedDateLabel}</p>
      {miss.available.length > 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-500">Book a make-up in another class this term:</p>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Choose a class…</option>
            {miss.available.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.day} {c.startTime}–{c.endTime}</option>)}
          </select>
          <input value={date} maxLength={40} onChange={(e) => setDate(e.target.value)} placeholder="Which date will they attend? e.g. Wed 6 Aug" className={inputCls} style={inputStyle} />
          <div className="flex items-center gap-2">
            <Button variant="success" size="sm" disabled={pending || !classId || !date.trim()}
              onClick={() => start(async () => { const r = await bookMakeupClass({ missedSessionId: miss.id, makeupSubjectId: classId, makeupDateLabel: date }); setMsg(r.ok ? 'Booked ✓' : (r.reason ?? 'Failed')) })}>
              {pending ? 'Booking…' : 'Book make-up'}
            </Button>
            <span className="text-[11px] text-slate-400">or leave it - it becomes credit next term</span>
            {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mt-1">No make-up classes available right now - this will become account credit toward next term.</p>
      )}
    </div>
  )
}

export default function MissedSessions({ students, misses }: { students: Student[]; misses: Miss[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="glass-card glass-card-pad"><ReportForm students={students} /></div>
      <div className="glass-card glass-card-pad">
        <h2 className="portal-section-title mb-3">Missed sessions &amp; make-ups</h2>
        {misses.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing here. Let us know in advance if your child will miss a class and you can book a make-up.</p>
        ) : (
          <div className="space-y-2">{misses.map((m) => <MissCard key={m.id} miss={m} />)}</div>
        )}
      </div>
    </div>
  )
}
