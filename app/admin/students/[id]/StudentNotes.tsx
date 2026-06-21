'use client'

import { useState, useTransition } from 'react'
import { Pin, PinOff, Trash2 } from 'lucide-react'
import { addStudentNote, deleteStudentNote, toggleStudentNotePin } from '../actions'
import { Button } from '@/components/ui/button'

type Note = { id: string; category: string; body: string; pinned: boolean; authorName: string | null; createdAt: string }

const CATEGORIES = ['general', 'academic', 'behaviour', 'billing', 'retention', 'safeguarding']
const CAT_COLOR: Record<string, string> = {
  general: 'bg-slate-100 text-slate-600',
  academic: 'bg-sky-100 text-sky-700',
  behaviour: 'bg-amber-100 text-amber-700',
  billing: 'bg-violet-100 text-violet-700',
  retention: 'bg-pink-100 text-pink-700',
  safeguarding: 'bg-red-100 text-red-700',
}

export default function StudentNotes({ studentId, notes }: { studentId: string; notes: Note[] }) {
  const [category, setCategory] = useState('general')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [pending, start] = useTransition()

  return (
    <div>
      <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.08)' }}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${category === c ? CAT_COLOR[c] : 'bg-white/70 text-slate-400'}`}>
              {c}
            </button>
          ))}
        </div>
        <textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a note or documentation…"
          className="w-full text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }} />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
          </label>
          <Button size="sm" disabled={pending || !body.trim()}
            onClick={() => start(async () => { const r = await addStudentNote({ studentId, category, body, pinned }); if (r.ok) { setBody(''); setPinned(false) } })}>
            {pending ? 'Saving…' : 'Add note'}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400">No notes yet. Use these to document academic progress, behaviour, billing, or retention conversations.</p>
      ) : (
        <div className="space-y-2.5">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl p-3" style={{ background: n.pinned ? 'rgba(0,157,255,.06)' : 'rgba(255,255,255,.5)', border: n.pinned ? '1px solid rgba(0,157,255,.25)' : '1px solid rgba(15,42,79,.06)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${CAT_COLOR[n.category] ?? CAT_COLOR.general}`}>{n.category}</span>
                {n.pinned && <span className="text-[10px] font-semibold text-primary">PINNED</span>}
                <span className="ml-auto text-[11px] text-slate-400">{n.authorName ?? 'Staff'} · {new Date(n.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <button type="button" title={n.pinned ? 'Unpin' : 'Pin'} onClick={() => start(async () => { await toggleStudentNotePin(n.id, studentId, !n.pinned) })} className="text-slate-300 hover:text-primary">
                  {n.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
                <button type="button" title="Delete" onClick={() => { if (confirm('Delete this note?')) start(async () => { await deleteStudentNote(n.id, studentId) }) }} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
