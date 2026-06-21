'use client'

import { useState, useTransition } from 'react'
import { updateTerm, createTerm, setActiveTerm } from './actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Term = { id: string; name: string; startISO: string; endISO: string; weeks: number; year: number; termNumber: number; isActive: boolean }

const inputCls = 'w-full text-sm rounded-lg px-3 py-2'
const inputStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' } as const

export default function TermForm({ term }: { term?: Term }) {
  const editing = !!term
  const [name, setName] = useState(term?.name ?? '')
  const [year, setYear] = useState(term?.year ?? new Date().getFullYear())
  const [termNumber, setTermNumber] = useState(term?.termNumber ?? 1)
  const [startDate, setStartDate] = useState(term ? term.startISO.slice(0, 10) : '')
  const [endDate, setEndDate] = useState(term ? term.endISO.slice(0, 10) : '')
  const [weeks, setWeeks] = useState(term?.weeks ?? 10)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    start(async () => {
      const r = editing
        ? await updateTerm({ id: term!.id, name, startDate, endDate, weeks })
        : await createTerm({ name, year, termNumber, startDate, endDate, weeks })
      setMsg(r.ok ? (editing ? 'Saved ✓' : 'Term added ✓') : (r.reason ?? 'Failed'))
      if (r.ok && !editing) { setName(''); setStartDate(''); setEndDate('') }
    })
  }

  return (
    <div className="glass-card glass-card-pad">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="portal-section-title" style={{ margin: 0 }}>{editing ? term!.name : 'Add a term'}</h2>
        {term?.isActive && <Badge variant="success" size="sm">active</Badge>}
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5">
        <label className="text-xs text-slate-500">Name
          <input className={inputCls} style={inputStyle} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Term 4 2026" />
        </label>
        <label className="text-xs text-slate-500">Billable weeks
          <input className={inputCls} style={inputStyle} type="number" inputMode="numeric" min={1} max={20} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
        </label>
        <label className="text-xs text-slate-500">Start date
          <input className={inputCls} style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="text-xs text-slate-500">End date
          <input className={inputCls} style={inputStyle} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        {!editing && (
          <>
            <label className="text-xs text-slate-500">Year
              <input className={inputCls} style={inputStyle} type="number" inputMode="numeric" min={2024} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </label>
            <label className="text-xs text-slate-500">Term number
              <input className={inputCls} style={inputStyle} type="number" min={1} max={4} value={termNumber} onChange={(e) => setTermNumber(Number(e.target.value))} />
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Add term'}
        </Button>
        {editing && !term!.isActive && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { await setActiveTerm(term!.id); setMsg('Set as active ✓') })} className="text-green-700 bg-green-100">
            Set as active term
          </Button>
        )}
        {msg && <span className="text-xs font-medium text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
