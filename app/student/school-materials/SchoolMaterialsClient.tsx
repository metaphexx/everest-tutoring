'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, FileText, Trash2, ExternalLink, Plus, X, Check, Clock, ShieldQuestion,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import FileDrop, { type UploadedFile } from '@/components/ui/FileDrop'
import { uploadCourseOutline, uploadSchoolDocument, deleteMaterial } from './actions'

export type OutlineCard = {
  id: string; subject: string; term: string | null; fileUrl: string | null
  uploadedAt: string; assessmentCount: number; extractionStatus: string
}
export type DocCard = {
  id: string; title: string; documentType: string; subject: string | null
  fileUrl: string | null; uploadedAt: string; moderationStatus: string
}

const DOC_TYPES = [
  ['homework', 'Homework sheet'], ['worksheet', 'Worksheet'], ['assignment', 'Assignment brief'],
  ['draft', 'Draft'], ['feedback', 'Teacher feedback'], ['notes', 'Class notes'],
  ['exam', 'Assessment / exam'], ['photo', 'Photo of a page'], ['other', 'Other'],
] as const

export default function SchoolMaterialsClient({
  outlines, documents, subjects, defaultTerm, initialOpen,
}: {
  outlines: OutlineCard[]
  documents: DocCard[]
  subjects: string[]
  defaultTerm: string
  initialOpen: 'outline' | 'document' | null
}) {
  const router = useRouter()
  const [openOutline, setOpenOutline] = useState(initialOpen === 'outline')
  const [openDoc, setOpenDoc] = useState(initialOpen === 'document')

  return (
    <div className="space-y-5">
      {/* Course Outlines */}
      <section className="glass-card glass-card-pad">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="portal-section-title flex items-center gap-2"><BookOpen size={16} className="text-primary" /> Course outlines</h2>
          <button type="button" onClick={() => setOpenOutline((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {openOutline ? <X size={14} /> : <Plus size={14} />} {openOutline ? 'Close' : 'Upload course outline'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Uploading your school&apos;s course outline helps your tutor align support with exactly what you&apos;re learning in class.</p>

        {openOutline && (
          <OutlineForm subjects={subjects} defaultTerm={defaultTerm} onDone={() => { setOpenOutline(false); router.refresh() }} />
        )}

        {outlines.length === 0 ? (
          <p className="text-sm text-slate-400 mt-2">No course outlines yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {outlines.map((o) => (
              <div key={o.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{o.subject} outline</p>
                    <p className="text-xs text-slate-500 mt-0.5">{o.term ?? defaultTerm} · uploaded {o.uploadedAt}</p>
                  </div>
                  <DeleteButton kind="outline" id={o.id} onDone={() => router.refresh()} />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
                    {o.assessmentCount} assessment{o.assessmentCount === 1 ? '' : 's'}
                  </span>
                  {o.fileUrl && (
                    <a href={o.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold">
                      Open file <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* School Documents */}
      <section className="glass-card glass-card-pad">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="portal-section-title flex items-center gap-2"><FileText size={16} className="text-primary" /> School documents</h2>
          <button type="button" onClick={() => setOpenDoc((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {openDoc ? <X size={14} /> : <Plus size={14} />} {openDoc ? 'Close' : 'Upload document'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Worksheets, assignment briefs, drafts, teacher feedback, notes, or a photo of a textbook page. Take a photo or upload a file.</p>

        {openDoc && (
          <DocForm subjects={subjects} onDone={() => { setOpenDoc(false); router.refresh() }} />
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-slate-400 mt-2">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 mt-2">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}>
                  <FileText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-dark truncate">{d.title}</p>
                  <p className="text-xs text-slate-400">{labelForType(d.documentType)}{d.subject ? ` · ${d.subject}` : ''} · {d.uploadedAt}</p>
                </div>
                {d.moderationStatus === 'needs_review' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title="Under review"><ShieldQuestion size={12} /> review</span>
                )}
                {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open file"><ExternalLink size={15} /></a>}
                <DeleteButton kind="document" id={d.id} onDone={() => router.refresh()} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function labelForType(t: string) {
  return DOC_TYPES.find(([v]) => v === t)?.[1] ?? 'Document'
}

function OutlineForm({ subjects, defaultTerm, onDone }: { subjects: string[]; defaultTerm: string; onDone: () => void }) {
  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [term, setTerm] = useState(defaultTerm)
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function save() {
    setError('')
    if (!file) { setError('Please add your course outline file.'); return }
    start(async () => {
      const res = await uploadCourseOutline({ subject, term, fileId: file.id })
      if (!res.ok) { setError(res.error ?? 'Could not save. Please try again.'); return }
      onDone()
    })
  }

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Subject</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Term</span>
          <input value={term} onChange={(e) => setTerm(e.target.value)} className="mt-1 w-full text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
        </label>
      </div>
      {file ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-3"><Check size={14} /> {file.originalName ?? 'File added'}</p>
      ) : (
        <FileDrop kind="course_outline" label="Upload your course outline" compact onUploaded={setFile} />
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <Button onClick={save} disabled={pending} className="mt-3 font-display">
        {pending ? 'Saving…' : 'Save outline'}
      </Button>
    </div>
  )
}

function DocForm({ subjects, onDone }: { subjects: string[]; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('worksheet')
  const [subject, setSubject] = useState('')
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function save() {
    setError('')
    if (!title.trim()) { setError('Please give your document a name.'); return }
    if (!file) { setError('Please attach a file.'); return }
    start(async () => {
      const res = await uploadSchoolDocument({ title, documentType, subject: subject || undefined, fileId: file.id })
      if (!res.ok) { setError(res.error ?? 'Could not save. Please try again.'); return }
      onDone()
    })
  }

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
      <label className="block mb-3">
        <span className="text-xs font-semibold text-slate-600">Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="e.g. Week 7 algebra worksheet" className="mt-1 w-full text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
      </label>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Type</span>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-1 w-full text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>
            {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Subject (optional)</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>
            <option value="">Not sure</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {file ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-3"><Check size={14} /> {file.originalName ?? 'File added'}</p>
      ) : (
        <FileDrop kind="school_document" label="Take a photo or upload a file" compact onUploaded={setFile} />
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <Button onClick={save} disabled={pending} className="mt-3 font-display">
        {pending ? 'Saving…' : 'Save document'}
      </Button>
    </div>
  )
}

function DeleteButton({ kind, id, onDone }: { kind: 'outline' | 'document'; id: string; onDone: () => void }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      aria-label="Delete"
      disabled={pending}
      onClick={() => start(async () => { await deleteMaterial({ kind, id }); onDone() })}
      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
    >
      {pending ? <Clock size={15} /> : <Trash2 size={15} />}
    </button>
  )
}
