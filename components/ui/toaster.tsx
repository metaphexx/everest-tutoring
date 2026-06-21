'use client'

import { Toaster as SonnerToaster } from 'sonner'

// App-wide toast host. Standardises action feedback (Undo, Restore, indexing,
// report drafting) as non-blocking toasts instead of inline text that shifts the
// layout. Use via `import { toast } from 'sonner'`.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'rgba(255,255,255,.92)',
          border: '1px solid var(--glass-border)',
          color: 'var(--ink-800)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          fontFamily: 'var(--font-ui)',
        },
      }}
    />
  )
}
