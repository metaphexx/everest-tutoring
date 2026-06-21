'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Lightweight shadcn-style Tooltip (no Radix). CSS hover/focus reveal of a small
// glass label above the trigger. Good enough for icon buttons and abbreviations;
// for complex content reach for a popover. The trigger keeps its own semantics.
function Tooltip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-50"
        style={{ background: 'var(--ink-800)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
      >
        {label}
      </span>
    </span>
  )
}

export { Tooltip }
