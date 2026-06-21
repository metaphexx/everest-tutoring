'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Lightweight shadcn-style Tabs. Self-contained (no Radix dependency) using a
// context + the brand pill styling. Controlled or uncontrolled via defaultValue.
type TabsCtx = { value: string; setValue: (v: string) => void }
const Ctx = React.createContext<TabsCtx | null>(null)
const useTabs = () => {
  const c = React.useContext(Ctx)
  if (!c) throw new Error('Tabs components must be used inside <Tabs>')
  return c
}

function Tabs({
  defaultValue, value: controlled, onValueChange, className, children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '')
  const value = controlled ?? internal
  const setValue = (v: string) => { if (controlled === undefined) setInternal(v); onValueChange?.(v) }
  return <Ctx.Provider value={{ value, setValue }}><div className={className}>{children}</div></Ctx.Provider>
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('inline-flex gap-1 p-1 rounded-xl', className)} role="tablist"
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active, setValue } = useTabs()
  const on = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={() => setValue(value)}
      className={cn('inline-flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]', className)}
      style={on ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: 'var(--ink-500)' }}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active } = useTabs()
  if (active !== value) return null
  return <div role="tabpanel" className={className}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
