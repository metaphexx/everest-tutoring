'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock, Users, Paperclip, X, FileText, BookOpen, Send, Check, ShieldCheck, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import FileDrop, { type UploadedFile } from '@/components/ui/FileDrop'
import { createQuestion, type AttachmentInput } from '@/app/student/ask/actions'

export type ClassOption = { id: string; name: string; yearLevel: number }
export type MaterialOption = {
  id: string
  label: string
  sourceType: 'course_outline' | 'school_document'
}

const PROMPTS = [
  'I don’t understand this topic',
  'Can you check my working?',
  'I need help with homework',
  'Can you explain this question?',
  'I missed this lesson',
  'I want extra practice',
  'I have an assessment coming up',
  'I uploaded my course outline',
]

type PendingAttachment = { key: string; label: string; payload: AttachmentInput }

export default function AskComposer({
  classes,
  materials,
  defaultClassId,
  autoFocus = false,
}: {
  classes: ClassOption[]
  materials: MaterialOption[]
  defaultClassId?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState('')
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? '')
  const [visibility, setVisibility] = useState<'private_to_tutor' | 'public_to_class'>('public_to_class')
  const [focused, setFocused] = useState(autoFocus)
  const [showAttach, setShowAttach] = useState(false)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [result, setResult] = useState<'sent' | 'held' | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const expanded = focused || body.length > 0 || attachments.length > 0

  function addPrompt(p: string) {
    setBody((b) => (b.trim() ? `${b.trim()}\n${p}` : p))
    taRef.current?.focus()
  }

  function toggleMaterial(m: MaterialOption) {
    const key = `${m.sourceType}:${m.id}`
    setAttachments((list) => {
      if (list.some((a) => a.key === key)) return list.filter((a) => a.key !== key)
      const payload: AttachmentInput =
        m.sourceType === 'course_outline'
          ? { sourceType: 'course_outline', outlineId: m.id }
          : { sourceType: 'school_document', documentId: m.id }
      return [...list, { key, label: m.label, payload }]
    })
  }

  function onUploaded(f: UploadedFile) {
    setAttachments((list) => [
      ...list,
      { key: `file:${f.id}`, label: f.originalName ?? 'Uploaded file', payload: { sourceType: 'direct_upload', fileId: f.id } },
    ])
    setShowAttach(false)
  }

  function removeAttachment(key: string) {
    setAttachments((list) => list.filter((a) => a.key !== key))
  }

  function submit() {
    setError('')
    if (body.trim().length < 3) { setError('Tell us a little about what you need help with.'); return }
    if (!classId) { setError('Choose one of your classes.'); return }
    startTransition(async () => {
      const res = await createQuestion({
        classId,
        body: body.trim(),
        visibility,
        attachments: attachments.map((a) => a.payload),
      })
      if (!res.ok) { setError(res.error ?? 'Something went wrong. Please try again.'); return }
      setResult(res.held ? 'held' : 'sent')
      setBody('')
      setAttachments([])
      setShowAttach(false)
      router.refresh()
      // Clear the confirmation after a moment so the composer is ready again.
      setTimeout(() => setResult(null), 5000)
    })
  }

  if (classes.length === 0) {
    return (
      <div className="glass-card glass-card-pad text-center">
        <p className="text-sm text-slate-500">You are not enrolled in any classes yet. Once you are, you can ask your tutor for help here.</p>
      </div>
    )
  }

  return (
    <div className="glass-card glass-card-pad ask-composer" data-expanded={expanded}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#009dff,#00FFFF)' }}>
          <Sparkles size={15} className="text-white" />
        </span>
        <h2 className="text-base font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>What do you need help with?</h2>
      </div>

      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="What are you stuck on?"
        rows={expanded ? 4 : 2}
        maxLength={4000}
        className="w-full text-sm rounded-2xl px-4 py-3 resize-none transition-all outline-none"
        style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)' }}
      />

      {/* Prompt chips */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {PROMPTS.map((p) => (
          <Button key={p} variant="soft" size="sm" onClick={() => addPrompt(p)} className="rounded-full text-[12px] min-h-0 px-2.5 py-1 font-medium">
            {p}
          </Button>
        ))}
      </div>

      {/* Attached materials */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {attachments.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(124,92,255,.1)', color: '#6D28D9' }}>
              <FileText size={12} /> {a.label}
              <button type="button" onClick={() => removeAttachment(a.key)} aria-label={`Remove ${a.label}`} className="ml-0.5 opacity-70 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Attach panel */}
      {showAttach && (
        <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(15,42,79,.08)' }}>
          {materials.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 mb-2">Your school materials</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {materials.map((m) => {
                  const on = attachments.some((a) => a.key === `${m.sourceType}:${m.id}`)
                  return (
                    <Button
                      key={`${m.sourceType}:${m.id}`}
                      variant={on ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => toggleMaterial(m)}
                      className="rounded-full text-[12px]"
                    >
                      {m.sourceType === 'course_outline' ? <BookOpen size={12} /> : <FileText size={12} />} {m.label}
                    </Button>
                  )
                })}
              </div>
            </>
          )}
          <p className="text-xs font-semibold text-slate-500 mb-2">Or upload a new file</p>
          <FileDrop kind="question" label="Add a photo or PDF" compact onUploaded={onUploaded} />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Class selector */}
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          aria-label="Choose a class"
          className="text-xs font-semibold rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(15,42,79,.12)', color: '#2A3342' }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} (Year {c.yearLevel})</option>
          ))}
        </select>

        {/* Visibility toggle: shared with the class by default. */}
        <div className="inline-flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(15,42,79,.12)' }}>
          <Button
            variant={visibility === 'public_to_class' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVisibility('public_to_class')}
            className="rounded-none"
          >
            <Users size={12} /> Share with class
          </Button>
          <Button
            variant={visibility === 'private_to_tutor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVisibility('private_to_tutor')}
            className="rounded-none"
          >
            <Lock size={12} /> Just my tutor
          </Button>
        </div>

        {/* Attach */}
        <Button variant="secondary" size="sm" onClick={() => setShowAttach((v) => !v)} className="rounded-xl text-[#6D28D9]">
          <Paperclip size={13} /> Attach
        </Button>

        {/* Submit */}
        <Button onClick={submit} disabled={pending} className="ml-auto font-display">
          <Send size={15} /> {pending ? 'Sending…' : 'Ask'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2" role="alert">{error}</p>}

      {result === 'sent' && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mt-2.5" role="status">
          <Check size={14} /> {visibility === 'public_to_class' ? 'Posted to your classroom. Your tutor and classmates can help.' : 'Sent privately to your tutor. You will see their reply here.'}
        </p>
      )}
      {result === 'held' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2.5" role="status">
          <ShieldCheck size={14} className="text-slate-400" /> Thanks, this has been submitted and may be reviewed by the Everest team before it appears.
        </p>
      )}
    </div>
  )
}
