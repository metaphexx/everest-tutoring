'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { draftReport, saveReport } from '@/app/reports/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const EFFORTS = ['Excellent', 'Good', 'Satisfactory', 'Needs focus']

export default function ReportEditor({
  studentId, subjectId, studentName, subjectName, yearLevel, color, initialEffort, initialComment, published,
}: {
  studentId: string
  subjectId: string
  studentName: string
  subjectName: string
  yearLevel: number
  color: string
  initialEffort: string | null
  initialComment: string | null
  published: boolean
}) {
  const [effort, setEffort] = useState(initialEffort ?? 'Good')
  const [comment, setComment] = useState(initialComment ?? '')
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  function aiDraft() {
    start(async () => {
      const r = await draftReport({ studentId, subjectId })
      setComment(r.comment)
      setEffort(r.effort)
    })
  }
  function save() {
    if (!comment.trim()) return
    start(async () => {
      await saveReport({ studentId, subjectId, effort, comment })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <div className="glass-card glass-card-pad">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>{studentName.slice(0, 2).toUpperCase()}</span>
          <div>
            <p className="font-display font-bold text-dark leading-tight">{studentName}</p>
            <p className="text-xs text-slate-500">Year {yearLevel} · {subjectName}</p>
          </div>
        </div>
        {published && <Badge variant="success" size="sm">Published</Badge>}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs font-semibold text-slate-500">Effort</label>
        <select value={effort} onChange={(e) => setEffort(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }}>
          {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <textarea value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Write a short end-of-term comment, or let Elliot draft one…" className="w-full text-sm rounded-xl px-3 py-2.5 resize-none" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }} />

      <div className="flex items-center gap-2 mt-2.5">
        <Button variant="soft" onClick={aiDraft} disabled={pending} className="text-[#6D28D9] border border-[rgba(124,92,255,.25)] [background:linear-gradient(135deg,rgba(0,157,255,.15),rgba(124,92,255,.18))]">
          <Sparkles size={15} /> {pending ? 'Drafting…' : 'Elliot draft'}
        </Button>
        <Button onClick={save} disabled={pending || !comment.trim()}>
          Save
        </Button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
      </div>
    </div>
  )
}
