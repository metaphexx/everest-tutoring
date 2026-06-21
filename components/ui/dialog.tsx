'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lightweight shadcn-style Dialog (no Radix). Portals to <body> so the portal
// chrome's backdrop-filter cards don't trap the fixed overlay, closes on Escape
// and backdrop click, and traps nothing fancy - matching the app's existing
// modal pattern (e.g. QuickActions). Mount-gated, so it never renders during SSR.
function Dialog({ open, onClose, children, className }: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,42,79,.45)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn('w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h4 className="font-display font-bold text-dark text-lg">{title}</h4>
      <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition-colors min-h-9 min-w-9 flex items-center justify-center">
        <X size={18} />
      </button>
    </div>
  )
}

function DialogBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}

export { Dialog, DialogHeader, DialogBody }
