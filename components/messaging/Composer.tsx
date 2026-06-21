'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, ImagePlus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendMessage } from '@/app/messages/actions'

type Pending = { id: string; url: string; name: string }

export default function Composer({ conversationId, placeholder = 'Write a message…', templates }: { conversationId: string; placeholder?: string; templates?: { label: string; text: string }[] }) {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<Pending[]>([])
  const [uploading, setUploading] = useState(false)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (chosen.length === 0) return
    setUploading(true)
    for (const file of chosen) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'message')
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const data = await res.json()
          setFiles((f) => [...f, { id: data.id, url: data.url, name: data.originalName ?? 'image' }])
        }
      } catch { /* ignore a single failed upload */ }
    }
    setUploading(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if ((!body && files.length === 0) || pending || uploading) return
    const fileIds = files.map((f) => f.id)
    start(async () => {
      await sendMessage({ conversationId, body, fileIds })
      setInput('')
      setFiles([])
      router.refresh()
    })
  }

  const canSend = (!!input.trim() || files.length > 0) && !uploading

  return (
    <div className="border-t" style={{ borderColor: 'rgba(15,42,79,.08)' }}>
      {templates && templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
          {templates.map((t) => (
            <Button key={t.label} variant="soft" size="sm" onClick={() => setInput(t.text)} className="rounded-full text-[11px] min-h-0 px-2.5 py-1">
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {/* Pending attachment thumbnails */}
      {(files.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2 px-3 pt-2.5">
          {files.map((f) => (
            <div key={f.id} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(15,42,79,.12)' }}>
              <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))} aria-label="Remove image" className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(0,0,0,.55)' }}>
                <X size={12} />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ border: '1px dashed rgba(15,42,79,.2)' }}>
              <Loader2 size={18} className="text-primary animate-spin" />
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="p-3 flex items-center gap-2">
        <Button type="button" variant="soft" size="icon" onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl flex-shrink-0" aria-label="Attach an image" title="Attach an image">
          <ImagePlus size={17} />
        </Button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          maxLength={4000}
          className="flex-1 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.1)' }}
        />
        <Button type="submit" size="icon" disabled={pending || !canSend} className="w-10 h-10 rounded-xl flex-shrink-0" aria-label="Send">
          <Send size={17} />
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
      </form>
    </div>
  )
}
