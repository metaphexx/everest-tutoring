'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type CalItem = { id: string; date: string; yearLevel: number; subject: string; title: string }

export default function AssessmentCalendar({ assessments }: { assessments: CalItem[] }) {
  const items = useMemo(() => assessments.map((a) => ({ ...a, d: new Date(a.date) })), [assessments])
  const earliest = useMemo(
    () => (items.length ? items.slice().sort((x, y) => +x.d - +y.d)[0].d : new Date()),
    [items],
  )
  const [cursor, setCursor] = useState(() => new Date(earliest.getFullYear(), earliest.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthLabel = cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const byDay = useMemo(() => {
    const m = new Map<number, CalItem[]>()
    for (const a of items) {
      if (a.d.getFullYear() === year && a.d.getMonth() === month) {
        const day = a.d.getDate()
        m.set(day, [...(m.get(day) ?? []), a])
      }
    }
    return m
  }, [items, year, month])

  const today = new Date()
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  const shift = (n: number) => setCursor(new Date(year, month + n, 1))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.1)' }}>
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <p className="font-display font-bold text-dark">{monthLabel}</p>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.1)' }}>
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-1">{w}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className="min-h-[64px] rounded-lg p-1.5"
            style={{ background: d ? 'rgba(255,255,255,.5)' : 'transparent', border: d ? `1px solid ${isToday(d) ? 'rgba(0,157,255,.4)' : 'rgba(15,42,79,.06)'}` : 'none' }}
          >
            {d && (
              <>
                <div className={`text-[11px] mb-1 ${isToday(d) ? 'font-bold text-primary' : 'text-slate-400'}`}>{d}</div>
                <div className="space-y-1">
                  {(byDay.get(d) ?? []).map((a) => (
                    <div key={a.id} className="text-[10px] leading-tight rounded px-1 py-0.5 truncate text-white" style={{ background: YEAR_COLORS[a.yearLevel] ?? '#009dff' }} title={`Y${a.yearLevel} ${a.subject}: ${a.title}`}>
                      Y{a.yearLevel} {a.subject}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
