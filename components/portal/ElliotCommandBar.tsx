'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

// Global command bar: ask Elliot anything from any admin page. Routes into the
// Elliot assistant with the query pre-run.
export default function ElliotCommandBar() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = q.trim()
    if (!text) { router.push('/admin/elliot'); return }
    router.push(`/admin/elliot?q=${encodeURIComponent(text)}`)
  }

  return (
    <form onSubmit={submit} className="flex-1 min-w-0">
      <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(124,92,255,.25)' }}>
        <Sparkles size={16} className="flex-shrink-0" style={{ color: '#7C3AED' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask Elliot, or tell it to message parents…"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-dark"
          aria-label="Ask Elliot"
        />
      </div>
    </form>
  )
}
