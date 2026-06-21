'use client'

import { useMemo, useState } from 'react'
import type { TrendData, TrendPoint } from '@/lib/attendance-trend'

const YEAR_COLOR: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const AVG_COLOR = '#0F2A4F'

const W = 680
const H = 300
const padL = 38
const padR = 14
const padT = 16
const padB = 34
const plotW = W - padL - padR
const plotH = H - padT - padB

function rate(points: TrendPoint[], week: number, subject: string, yearFilter: (y: number) => boolean): number | null {
  let ok = 0
  let total = 0
  for (const p of points) {
    if (p.week === week && yearFilter(p.year) && (subject === 'all' || p.subject === subject)) {
      ok += p.ok
      total += p.total
    }
  }
  return total ? Math.round((ok / total) * 100) : null
}

export default function AttendanceTrend({ data }: { data: TrendData }) {
  const { weeks, points, subjects, years } = data
  const [subject, setSubject] = useState('all')
  const [yearsOn, setYearsOn] = useState<number[]>(years)
  const [showAvg, setShowAvg] = useState(true)

  const x = (i: number) => padL + (weeks.length <= 1 ? plotW / 2 : (i / (weeks.length - 1)) * plotW)
  const y = (pct: number) => padT + (1 - pct / 100) * plotH

  const lines = useMemo(() => {
    const out: { color: string; label: string; pts: { x: number; y: number; pct: number }[]; dashed?: boolean; width: number }[] = []
    for (const yr of yearsOn) {
      const pts = weeks
        .map((w, i) => { const v = rate(points, w, subject, (y2) => y2 === yr); return v === null ? null : { x: x(i), y: y(v), pct: v } })
        .filter((p): p is { x: number; y: number; pct: number } => p !== null)
      if (pts.length) out.push({ color: YEAR_COLOR[yr] ?? '#009dff', label: `Year ${yr}`, pts, width: 2 })
    }
    if (showAvg) {
      const pts = weeks
        .map((w, i) => { const v = rate(points, w, subject, (y2) => yearsOn.includes(y2)); return v === null ? null : { x: x(i), y: y(v), pct: v } })
        .filter((p): p is { x: number; y: number; pct: number } => p !== null)
      if (pts.length) out.push({ color: AVG_COLOR, label: 'Average', pts, dashed: true, width: 2.5 })
    }
    return out
    // x/y are pure scale fns derived only from `weeks` (already a dep), so listing
    // them would recompute every render and defeat the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, points, subject, yearsOn, showAvg])

  const toggleYear = (yr: number) => setYearsOn((s) => (s.includes(yr) ? s.filter((v) => v !== yr) : [...s, yr].sort((a, b) => a - b)))

  if (weeks.length === 0) return <p className="text-sm text-slate-400">No attendance recorded yet.</p>

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {years.map((yr) => {
          const on = yearsOn.includes(yr)
          return (
            <button key={yr} type="button" onClick={() => toggleYear(yr)} className="text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1.5" style={{ background: on ? `${YEAR_COLOR[yr]}1a` : 'rgba(255,255,255,.5)', color: on ? YEAR_COLOR[yr] : '#94a3b8', border: `1px solid ${on ? YEAR_COLOR[yr] : 'rgba(15,42,79,.1)'}` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: on ? YEAR_COLOR[yr] : '#cbd5e1' }} /> Y{yr}
            </button>
          )
        })}
        <button type="button" onClick={() => setShowAvg((v) => !v)} className="text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1.5" style={{ background: showAvg ? 'rgba(15,42,79,.1)' : 'rgba(255,255,255,.5)', color: showAvg ? AVG_COLOR : '#94a3b8', border: `1px solid ${showAvg ? AVG_COLOR : 'rgba(15,42,79,.1)'}` }}>
          <span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: showAvg ? AVG_COLOR : '#cbd5e1' }} /> Avg
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }} role="img" aria-label="Attendance percentage over the weeks of term">
        {/* gridlines + y labels */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="rgba(15,42,79,.08)" strokeWidth={1} />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{g}%</text>
          </g>
        ))}
        {/* x labels */}
        {weeks.map((w, i) => (
          <text key={w} x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">W{w}</text>
        ))}
        {/* lines */}
        {lines.map((ln) => (
          <g key={ln.label}>
            <polyline fill="none" stroke={ln.color} strokeWidth={ln.width} strokeDasharray={ln.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" points={ln.pts.map((p) => `${p.x},${p.y}`).join(' ')} />
            {ln.pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={ln.dashed ? 0 : 3} fill={ln.color} />)}
          </g>
        ))}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {lines.map((ln) => (
          <span key={ln.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-4 h-0 border-t-2" style={{ borderColor: ln.color, borderStyle: ln.dashed ? 'dashed' : 'solid' }} /> {ln.label}
          </span>
        ))}
      </div>
    </div>
  )
}
