'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, UserPlus, Megaphone, FileText } from 'lucide-react'
import { addAssessmentDate, addReferral, addNotice, addOutline } from './actions'
import { Button } from '@/components/ui/button'
import { isEmail, isPhone, sanitizeNameInput, sanitizePhoneInput, LIMITS } from '@/lib/validate'

const SUBJECTS = ['Maths', 'English', 'Science']
const YEARS = [8, 9, 10]

const inputCls = 'w-full text-sm rounded-xl px-3 py-2.5'
const inputStyle = { background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' } as const

export default function PartnerSubmit() {
  const [mode, setMode] = useState<null | 'assess' | 'refer' | 'notice' | 'outline'>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const reset = () => { setMode(null); router.refresh() }

  // assessment
  const [aYear, setAYear] = useState(9)
  const [aSubject, setASubject] = useState('Maths')
  const [aTitle, setATitle] = useState('')
  const [aDate, setADate] = useState('')
  // referral
  const [rName, setRName] = useState('')
  const [rYear, setRYear] = useState(9)
  const [rSubject, setRSubject] = useState('')
  const [rReason, setRReason] = useState('')
  const [rPName, setRPName] = useState('')
  const [rPEmail, setRPEmail] = useState('')
  const [rPPhone, setRPPhone] = useState('')
  // notice
  const [nTitle, setNTitle] = useState('')
  const [nCategory, setNCategory] = useState('general')
  const [nBody, setNBody] = useState('')
  // course outline
  const [oYear, setOYear] = useState(9)
  const [oSubject, setOSubject] = useState('Maths')
  const [oFileName, setOFileName] = useState('')
  const [oText, setOText] = useState('')
  const [oUrl, setOUrl] = useState('')
  const [oResult, setOResult] = useState<string | null>(null)

  const onOutlineFile = (file: File | undefined) => {
    if (!file) return
    setOFileName(file.name)
    // Read text-based files straight into the box. PDFs/DOCX: paste the text or
    // add the Drive link (dev: server-side extraction noted in lib/materials.ts).
    if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
      const reader = new FileReader()
      reader.onload = () => setOText(String(reader.result || ''))
      reader.readAsText(file)
    }
  }

  const btn = (key: typeof mode, Icon: typeof CalendarDays, label: string, color: string) => (
    <button type="button" onClick={() => setMode(mode === key ? null : key)} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium" style={{ background: mode === key ? `${color}22` : 'rgba(255,255,255,.6)', color, border: '1px solid rgba(255,255,255,.7)' }}>
      <Icon size={16} /> {label}
    </button>
  )

  return (
    <div className="glass-card glass-card-pad">
      <h2 className="portal-section-title mb-1">Share with Everest</h2>
      <p className="text-xs text-slate-500 mb-3">Post upcoming assessments, refer a student, or send us a notice.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {btn('assess', CalendarDays, 'Assessment date', '#009dff')}
        {btn('refer', UserPlus, 'Refer a student', '#7C3AED')}
        {btn('notice', Megaphone, 'Send a notice', '#d97706')}
        {btn('outline', FileText, 'Course outline', '#0EA5A4')}
      </div>

      {mode === 'assess' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={aYear} onChange={(e) => setAYear(Number(e.target.value))} className={inputCls} style={inputStyle}>{YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
            <select value={aSubject} onChange={(e) => setASubject(e.target.value)} className={inputCls} style={inputStyle}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Assessment title (e.g. Algebra topic test)" className={inputCls} style={inputStyle} />
          <input type="date" value={aDate} onChange={(e) => setADate(e.target.value)} className={inputCls} style={inputStyle} />
          <Button disabled={pending || !aTitle.trim() || !aDate} onClick={() => start(async () => { await addAssessmentDate({ yearLevel: aYear, subject: aSubject, title: aTitle, date: aDate }); setATitle(''); setADate(''); reset() })} className="w-full">{pending ? 'Saving…' : 'Add assessment date'}</Button>
        </div>
      )}

      {mode === 'refer' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={rName} maxLength={LIMITS.name} onChange={(e) => setRName(sanitizeNameInput(e.target.value))} placeholder="Student name" className={inputCls} style={inputStyle} />
            <select value={rYear} onChange={(e) => setRYear(Number(e.target.value))} className={inputCls} style={inputStyle}>{YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
          </div>
          <select value={rSubject} onChange={(e) => setRSubject(e.target.value)} className={inputCls} style={inputStyle}><option value="">Any subject</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          <textarea value={rReason} maxLength={LIMITS.notes} onChange={(e) => setRReason(e.target.value.slice(0, LIMITS.notes))} rows={2} placeholder="Why would they benefit from tutoring? (Everest tailors the outreach to this)" className={`${inputCls} resize-none`} style={inputStyle} />
          <p className="text-xs font-semibold text-slate-500 pt-1">Parent contact (so we can reach out)</p>
          <input value={rPName} maxLength={LIMITS.name} onChange={(e) => setRPName(sanitizeNameInput(e.target.value))} placeholder="Parent / guardian name" className={inputCls} style={inputStyle} />
          <div className="grid grid-cols-2 gap-2">
            <input type="email" inputMode="email" maxLength={LIMITS.email} value={rPEmail} onChange={(e) => setRPEmail(e.target.value)} placeholder="Parent email" className={inputCls} style={inputStyle} />
            <input type="tel" inputMode="tel" maxLength={LIMITS.phone} value={rPPhone} onChange={(e) => setRPPhone(sanitizePhoneInput(e.target.value))} placeholder="Parent phone" className={inputCls} style={inputStyle} />
          </div>
          {!!rPEmail && !isEmail(rPEmail) && <p className="text-xs text-red-600">Enter a valid email address.</p>}
          {!!rPPhone && !isPhone(rPPhone) && <p className="text-xs text-red-600">Enter a valid Australian number.</p>}
          <Button variant="violet" className="w-full" disabled={pending || !rName.trim() || !rReason.trim() || !isEmail(rPEmail) || !isPhone(rPPhone)} onClick={() => start(async () => { await addReferral({ studentName: rName, yearLevel: rYear, subject: rSubject || undefined, reason: rReason, parentName: rPName || undefined, parentEmail: rPEmail, parentPhone: rPPhone }); setRName(''); setRReason(''); setRPName(''); setRPEmail(''); setRPPhone(''); reset() })}>{pending ? 'Sending…' : 'Refer student to Everest'}</Button>
        </div>
      )}

      {mode === 'notice' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="Notice title" className={inputCls} style={inputStyle} />
            <select value={nCategory} onChange={(e) => setNCategory(e.target.value)} className={inputCls} style={inputStyle}><option value="general">General</option><option value="room">Room change</option><option value="timetable">Timetable</option><option value="term">Term dates</option></select>
          </div>
          <textarea value={nBody} onChange={(e) => setNBody(e.target.value)} rows={2} placeholder="Details for the Everest team…" className={`${inputCls} resize-none`} style={inputStyle} />
          <Button variant="amber" className="w-full" disabled={pending || !nTitle.trim() || !nBody.trim()} onClick={() => start(async () => { await addNotice({ title: nTitle, body: nBody, category: nCategory }); setNTitle(''); setNBody(''); reset() })}>{pending ? 'Sending…' : 'Send notice'}</Button>
        </div>
      )}

      {mode === 'outline' && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={oYear} onChange={(e) => setOYear(Number(e.target.value))} className={inputCls} style={inputStyle}>{YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
            <select value={oSubject} onChange={(e) => setOSubject(e.target.value)} className={inputCls} style={inputStyle}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <label className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 cursor-pointer" style={inputStyle}>
            <FileText size={15} className="text-teal-600" />
            <span className="text-slate-600 truncate">{oFileName || 'Choose outline file (.txt, .md, .pdf, .docx)'}</span>
            <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" className="hidden" onChange={(e) => onOutlineFile(e.target.files?.[0])} />
          </label>
          <textarea value={oText} onChange={(e) => setOText(e.target.value)} rows={5} placeholder="Outline text - text files load automatically; for PDF/Word, paste the outline here so the AI can read it" className={`${inputCls} resize-none`} style={inputStyle} />
          <input value={oUrl} onChange={(e) => setOUrl(e.target.value)} placeholder="Optional: link to the file (e.g. Google Drive)" className={inputCls} style={inputStyle} />
          {oResult && <p className="text-xs font-medium text-teal-700">{oResult}</p>}
          <Button variant="teal" className="w-full" disabled={pending || !oText.trim()} onClick={() => start(async () => { const r = await addOutline({ yearLevel: oYear, subject: oSubject, fileName: oFileName, sourceUrl: oUrl || undefined, rawText: oText }); setOResult(r.ok ? `Scanned: ${r.assessmentsAdded ?? 0} assessment date(s) and ${r.topics ?? 0} topic(s) shared with tutors.` : 'Could not scan that outline.'); setOText(''); setOFileName(''); setOUrl(''); router.refresh() })}>{pending ? 'Scanning…' : 'Upload & scan outline'}</Button>
        </div>
      )}
    </div>
  )
}
