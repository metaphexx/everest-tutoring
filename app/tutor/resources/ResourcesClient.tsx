'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check, Trash2, Eye, EyeOff, Library, Megaphone, ExternalLink, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FileDrop, { type UploadedFile } from '@/components/ui/FileDrop'
import { uploadResource, toggleResourceVisibility, deleteResource, postAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from './actions'

export type ClassOpt = { id: string; label: string; subject: string; yearLevel: number }
export type ResourceRow = { id: string; title: string; meta: string; visible: boolean; url: string | null }
export type AnnouncementRow = { id: string; className: string; body: string; createdAt: string; pinned: boolean }

const FILE_TYPES = [['booklet', 'Booklet'], ['worksheet', 'Worksheet'], ['practice_test', 'Practice test'], ['revision', 'Revision sheet'], ['answer_key', 'Answer key'], ['other', 'Other']] as const

export default function ResourcesClient({ classes, resources, announcements }: { classes: ClassOpt[]; resources: ResourceRow[]; announcements: AnnouncementRow[] }) {
  const router = useRouter()
  const [openRes, setOpenRes] = useState(false)
  const [openAnn, setOpenAnn] = useState(false)
  const [pending, start] = useTransition()

  return (
    <div className="space-y-5">
      {/* Resources */}
      <section className="glass-card glass-card-pad">
        <div className="flex items-center justify-between mb-3">
          <h2 className="portal-section-title flex items-center gap-2"><Library size={16} className="text-primary" /> Resources</h2>
          <button type="button" onClick={() => setOpenRes((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">{openRes ? <X size={14} /> : <Plus size={14} />} {openRes ? 'Close' : 'Upload resource'}</button>
        </div>
        {openRes && <ResourceForm classes={classes} onDone={() => { setOpenRes(false); router.refresh() }} />}
        {resources.length === 0 ? (
          <p className="text-sm text-slate-400">No resources yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-dark truncate">{r.title}</p>
                  <p className="text-xs text-slate-400">{r.meta}</p>
                </div>
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label="Open"><ExternalLink size={15} /></a>}
                <button type="button" disabled={pending} onClick={() => start(async () => { await toggleResourceVisibility({ id: r.id }); router.refresh() })} className="text-slate-400 hover:text-primary" title={r.visible ? 'Visible to students' : 'Hidden from students'} aria-label="Toggle visibility">
                  {r.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button type="button" disabled={pending} onClick={() => start(async () => { await deleteResource({ id: r.id }); router.refresh() })} className="text-slate-300 hover:text-red-500" aria-label="Delete"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Announcements */}
      <section className="glass-card glass-card-pad">
        <div className="flex items-center justify-between mb-3">
          <h2 className="portal-section-title flex items-center gap-2"><Megaphone size={16} className="text-primary" /> Announcements</h2>
          <button type="button" onClick={() => setOpenAnn((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">{openAnn ? <X size={14} /> : <Plus size={14} />} {openAnn ? 'Close' : 'Post announcement'}</button>
        </div>
        {openAnn && <AnnouncementForm classes={classes} onDone={() => { setOpenAnn(false); router.refresh() }} />}
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-400">No announcements yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: a.pinned ? 'rgba(124,92,255,.06)' : 'rgba(255,255,255,.55)', border: `1px solid ${a.pinned ? 'rgba(124,92,255,.2)' : 'rgba(15,42,79,.07)'}` }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{a.className} · {a.createdAt}{a.pinned ? ' · pinned' : ''}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{a.body}</p>
                </div>
                <button type="button" disabled={pending} onClick={() => start(async () => { await toggleAnnouncementPin({ id: a.id }); router.refresh() })} className="flex-shrink-0" style={{ color: a.pinned ? '#6D28D9' : '#cbd5e1' }} aria-label={a.pinned ? 'Unpin' : 'Pin'} title={a.pinned ? 'Unpin' : 'Pin to top'}><Pin size={15} /></button>
                <button type="button" disabled={pending} onClick={() => start(async () => { await deleteAnnouncement({ id: a.id }); router.refresh() })} className="text-slate-300 hover:text-red-500 flex-shrink-0" aria-label="Delete"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ResourceForm({ classes, onDone }: { classes: ClassOpt[]; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [fileType, setFileType] = useState('worksheet')
  const [week, setWeek] = useState('')
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function save() {
    setError('')
    if (!title.trim()) { setError('Please add a title.'); return }
    const cls = classes.find((c) => c.id === classId)
    start(async () => {
      const res = await uploadResource({
        title, classId, subject: cls?.subject ?? 'Maths', yearLevel: cls?.yearLevel ?? 9,
        fileType, weekNumber: week ? parseInt(week, 10) : undefined, topic: topic || undefined, fileId: file?.id,
      })
      if (!res.ok) { setError(res.error ?? 'Could not save.'); return }
      onDone()
    })
  }

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Resource title" className="w-full text-sm rounded-xl px-3 py-2 mb-3" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>{FILE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input value={week} onChange={(e) => setWeek(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Week (optional)" inputMode="numeric" className="text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
        <input value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 80))} placeholder="Topic (optional)" className="text-sm rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
      </div>
      {file ? <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-3"><Check size={14} /> {file.originalName ?? 'File added'}</p> : <FileDrop kind="resource" label="Attach a file (optional)" compact onUploaded={setFile} />}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <Button onClick={save} disabled={pending} className="mt-3 font-display">{pending ? 'Saving…' : 'Save resource'}</Button>
    </div>
  )
}

function AnnouncementForm({ classes, onDone }: { classes: ClassOpt[]; onDone: () => void }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function save() {
    setError('')
    if (body.trim().length < 2) { setError('Please write your announcement.'); return }
    start(async () => {
      const res = await postAnnouncement({ classId, body: body.trim() })
      if (!res.ok) { setError(res.error ?? 'Could not post.'); return }
      onDone()
    })
  }

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full text-sm rounded-xl px-3 py-2 mb-2" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }}>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 600))} rows={3} placeholder="Share a quick update with the class…" className="w-full text-sm rounded-xl px-3 py-2 resize-none" style={{ background: '#fff', border: '1px solid rgba(15,42,79,.12)' }} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <Button onClick={save} disabled={pending} className="mt-2 font-display">{pending ? 'Posting…' : 'Post'}</Button>
    </div>
  )
}
