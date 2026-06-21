'use client'

import { useRef, useState, useCallback } from 'react'
import { UploadCloud, Camera, Loader2, Check, AlertCircle } from 'lucide-react'

export type UploadedFile = {
  id: string
  url: string
  originalName: string | null
  mimeType: string | null
  sizeBytes: number
}

type Props = {
  kind?: string
  /** Accept attribute for the picker. Defaults to images + PDF. */
  accept?: string
  /** Show a "Take photo" affordance that opens the rear camera on mobile. */
  allowCamera?: boolean
  label?: string
  hint?: string
  compact?: boolean
  onUploaded: (file: UploadedFile) => void
  onError?: (message: string) => void
}

// Shared upload control: drag-and-drop on desktop, tap to choose a file or take a
// photo on mobile. Uploads immediately to /api/upload and reports progress.
export default function FileDrop({
  kind = 'upload',
  accept = 'image/*,application/pdf',
  allowCamera = true,
  label = 'Add a file',
  hint = 'Drag a file here, or tap to choose. Photos and PDFs up to 10 MB.',
  compact = false,
  onUploaded,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [message, setMessage] = useState('')

  const upload = useCallback((file: File) => {
    setState('uploading')
    setProgress(0)
    setMessage(file.name)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as UploadedFile
          setState('done')
          onUploaded(data)
          // Reset to idle shortly so the control can take another file.
          setTimeout(() => setState('idle'), 1400)
        } catch {
          fail('Upload failed. Please try again.')
        }
      } else {
        let msg = 'Upload failed. Please try again.'
        try { msg = JSON.parse(xhr.responseText).error ?? msg } catch { /* keep default */ }
        fail(msg)
      }
    }
    xhr.onerror = () => fail('Upload failed. Please check your connection.')
    xhr.send(fd)

    function fail(m: string) {
      setState('error')
      setMessage(m)
      onError?.(m)
    }
  }, [kind, onUploaded, onError])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) upload(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) upload(f)
  }

  return (
    <div className={compact ? '' : 'w-full'}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center text-center rounded-2xl cursor-pointer transition-colors"
        style={{
          padding: compact ? '14px' : '22px',
          border: `1.5px dashed ${dragOver ? '#009dff' : 'rgba(15,42,79,.18)'}`,
          background: dragOver ? 'rgba(0,157,255,.06)' : 'rgba(255,255,255,.5)',
        }}
        aria-label={label}
      >
        {state === 'uploading' ? (
          <>
            <Loader2 size={compact ? 18 : 22} className="text-primary animate-spin" />
            <p className="text-xs text-slate-500 mt-2">Uploading {progress}%</p>
            <div className="w-full max-w-[220px] h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(15,42,79,.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#009dff,#00FFFF)', transition: 'width .15s linear' }} />
            </div>
          </>
        ) : state === 'done' ? (
          <>
            <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22A05B,#16a34a)' }}>
              <Check size={16} className="text-white" />
            </span>
            <p className="text-xs font-semibold text-green-700 mt-2">Uploaded</p>
          </>
        ) : state === 'error' ? (
          <>
            <AlertCircle size={compact ? 18 : 22} className="text-red-500" />
            <p className="text-xs text-red-600 mt-2 max-w-[240px]">{message}</p>
            <span className="text-[11px] text-slate-400 mt-1">Tap to try again</span>
          </>
        ) : (
          <>
            <UploadCloud size={compact ? 18 : 22} className="text-primary" />
            <p className="text-sm font-semibold text-dark mt-2" style={{ fontFamily: 'var(--font-display)' }}>{label}</p>
            {!compact && <p className="text-xs text-slate-500 mt-1 max-w-[280px]">{hint}</p>}
          </>
        )}
      </div>

      {allowCamera && state !== 'uploading' && (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(15,42,79,.1)', color: '#404B5C' }}
        >
          <Camera size={14} /> Take a photo
        </button>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
    </div>
  )
}
