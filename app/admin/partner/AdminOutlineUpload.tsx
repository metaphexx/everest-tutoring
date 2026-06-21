'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'
import { addOutline } from '@/app/partner/actions'

const SUBJECTS = ['Maths', 'English', 'Science']
const YEARS = [8, 9, 10]
const field = 'text-sm rounded-lg px-3 py-2'
const fieldStyle = { background: 'rgba(255,255,255,.75)', border: '1px solid rgba(15,42,79,.12)' } as const

export default function AdminOutlineUpload() {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(9)
  const [subject, setSubject] = useState('Maths')
  const [fileName, setFileName] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  const onFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
      const r = new FileReader()
      r.onload = () => setText(String(r.result || ''))
      r.readAsText(file)
    }
  }

  const submit = () =>
    start(async () => {
      const r = await addOutline({ yearLevel: year, subject, fileName, sourceUrl: url || undefined, rawText: text })
      setMsg(r.ok ? `Scanned: ${r.assessmentsAdded ?? 0} assessment date(s), ${r.topics ?? 0} topic(s).` : 'Could not scan that outline.')
      setText(''); setFileName(''); setUrl('')
      router.refresh()
    })

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <FileUp size={15} /> Upload an outline
      </button>
    )
  }

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-2">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field} style={fieldStyle}>{YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field} style={fieldStyle}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
        <label className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 cursor-pointer flex-1 truncate" style={fieldStyle}>
          <FileUp size={14} className="text-teal-600 flex-shrink-0" />
          <span className="text-slate-600 truncate">{fileName || 'Choose file'}</span>
          <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Outline text (paste for PDF/Word so the AI can scan it)" className={`${field} w-full resize-none`} style={fieldStyle} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Optional: link to the PDF (Google Drive) - tutors can open it" className={`${field} w-full`} style={fieldStyle} />
      {msg && <p className="text-xs font-medium text-teal-700">{msg}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || !text.trim()} onClick={submit} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#14B8A6,#0D9488)' }}>
          {pending ? 'Scanning…' : 'Upload & scan'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400">cancel</button>
      </div>
    </div>
  )
}
