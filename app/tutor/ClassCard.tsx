'use client'

import { useState, useTransition } from 'react'
import { Check, Clock, X, Shield, NotebookPen, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markAttendance, saveLessonNote } from './actions'

type Status = 'present' | 'late' | 'absent' | 'excused' | 'unmarked'

type Student = { id: string; firstName: string; lastName: string }

type Props = {
  subject: { id: string; name: string; yearLevel: number; startTime: string; endTime: string; color: string }
  dateStr: string
  dateLabel: string
  isToday: boolean
  students: Student[]
  initialStatuses: Record<string, Status>
  initialNote: { summary: string; homework: string | null } | null
}

const OPTIONS: { key: Exclude<Status, 'unmarked'>; label: string; Icon: typeof Check; color: string; bg: string }[] = [
  { key: 'present', label: 'Present', Icon: Check, color: '#16a34a', bg: '#dcfce7' },
  { key: 'late', label: 'Late', Icon: Clock, color: '#d97706', bg: '#fef3c7' },
  { key: 'absent', label: 'Absent', Icon: X, color: '#dc2626', bg: '#fee2e2' },
  { key: 'excused', label: 'Excused', Icon: Shield, color: '#475569', bg: '#e2e8f0' },
]

export default function ClassCard({ subject, dateStr, dateLabel, isToday, students, initialStatuses, initialNote }: Props) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(initialStatuses)
  const [, startTransition] = useTransition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [summary, setSummary] = useState(initialNote?.summary ?? '')
  const [homework, setHomework] = useState(initialNote?.homework ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  function setStatus(studentId: string, status: Exclude<Status, 'unmarked'>) {
    const prev = statuses[studentId] ?? 'unmarked'
    if (prev === status) return
    setStatuses((s) => ({ ...s, [studentId]: status }))
    startTransition(async () => {
      try {
        await markAttendance({ subjectId: subject.id, studentId, dateStr, status })
      } catch {
        setStatuses((s) => ({ ...s, [studentId]: prev }))
      }
    })
  }

  // One-tap: mark everyone who isn't already present as present. Tutors can then
  // just flip the few exceptions (late/absent/excused).
  function markAllPresent() {
    const prev = { ...statuses }
    const toMark = students.filter((st) => (statuses[st.id] ?? 'unmarked') !== 'present')
    if (toMark.length === 0) return
    setStatuses((s) => {
      const next = { ...s }
      for (const st of students) next[st.id] = 'present'
      return next
    })
    startTransition(async () => {
      for (const st of toMark) {
        try {
          await markAttendance({ subjectId: subject.id, studentId: st.id, dateStr, status: 'present' })
        } catch {
          setStatuses((s) => ({ ...s, [st.id]: prev[st.id] ?? 'unmarked' }))
        }
      }
    })
  }

  function onSaveNote(e: React.FormEvent) {
    e.preventDefault()
    setSavingNote(true)
    startTransition(async () => {
      try {
        await saveLessonNote({ subjectId: subject.id, dateStr, summary, homework })
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 2500)
      } catch {
        /* keep form open */
      } finally {
        setSavingNote(false)
      }
    })
  }

  const marked = Object.values(statuses).filter((s) => s !== 'unmarked').length
  const present = Object.values(statuses).filter((s) => s === 'present' || s === 'late').length

  return (
    <div className="glass-card glass-card-pad">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: subject.color }}
          >
            Y{subject.yearLevel}
          </span>
          <div>
            <p className="font-display font-bold text-dark leading-tight">{subject.name}</p>
            <p className="text-xs text-slate-400">
              {dateLabel}
              {isToday && <span className="ml-1.5 font-semibold text-primary">Today</span>}
              {' · '}
              {subject.startTime}–{subject.endTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {students.length > 0 && present < students.length && (
            <button
              type="button"
              onClick={markAllPresent}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
              style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
            >
              <Check size={13} strokeWidth={3} /> All present
            </button>
          )}
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {present}/{students.length} in
          </span>
        </div>
      </div>

      {/* roster */}
      <div className="space-y-1.5">
        {students.length === 0 && (
          <p className="text-sm text-slate-300 py-3 text-center">No students enrolled</p>
        )}
        {students.map((st) => {
          const current = statuses[st.id] ?? 'unmarked'
          return (
            <div key={st.id} className="flex items-center gap-3 py-1.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: subject.color }}
              >
                {st.firstName[0]}
                {st.lastName[0]}
              </div>
              <span className="text-sm text-dark flex-1 min-w-0 truncate">
                {st.firstName} {st.lastName}
              </span>
              <div className="flex gap-1.5 flex-shrink-0">
                {OPTIONS.map(({ key, label, Icon, color, bg }) => {
                  const active = current === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(st.id, key)}
                      aria-pressed={active}
                      aria-label={label}
                      title={label}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: active ? bg : 'transparent',
                        color: active ? color : '#cbd5e1',
                        border: `1.5px solid ${active ? color : '#e2e8f0'}`,
                      }}
                    >
                      <Icon size={16} strokeWidth={2.5} />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* lesson note */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setNoteOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-primary"
        >
          <NotebookPen size={15} />
          {initialNote || summary ? 'Lesson note' : 'Add lesson note'}
          <ChevronDown size={14} className={`transition-transform ${noteOpen ? 'rotate-180' : ''}`} />
          {marked > 0 && (
            <span className="ml-auto text-xs font-normal text-slate-400">
              {marked}/{students.length} marked
            </span>
          )}
        </button>

        {noteOpen && (
          <form onSubmit={onSaveNote} className="mt-3 space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">What we covered</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                placeholder="e.g. Linear equations - solving for x and graphing."
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Homework (optional)</label>
              <input
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="e.g. Exercise 7B Q1–10"
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingNote} className="rounded-full">
                {savingNote ? 'Saving…' : 'Save note'}
              </Button>
              {noteSaved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
