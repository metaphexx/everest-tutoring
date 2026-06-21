import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Flag, Sparkles, ShieldAlert } from 'lucide-react'
import Composer from './Composer'
import PriorityToggle from './PriorityToggle'
import ReleaseFlagButton from './ReleaseFlagButton'

export type ConvListItem = {
  id: string
  title: string
  subtitle?: string
  snippet: string
  lastAt: Date
  flaggedCount: number
  tags?: string[]
  status?: string
}

export type MessageAttachment = { id: string; url: string; originalName?: string | null; mimeType?: string | null }

export type ThreadMessage = {
  id: string
  body: string
  senderName: string
  senderRole: string
  mine: boolean
  createdAt: Date
  flagged: boolean
  flagCategory?: string | null
  flagSeverity?: string | null
  flagReason?: string | null
  attachments?: MessageAttachment[]
}

export type SelectedThread = {
  id: string
  title: string
  subtitle?: string
  summary?: string | null
  messages: ThreadMessage[]
  canReply: boolean
  composerPlaceholder?: string
  priority?: boolean
}

const SEVERITY_COLOR: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#64748b' }

export default function MessagesView({
  conversations,
  selected,
  basePath,
  showFlags = false,
  showSummary = false,
  emptyHint = 'No conversations yet.',
  starters,
  templates,
}: {
  conversations: ConvListItem[]
  selected: SelectedThread | null
  basePath: string
  showFlags?: boolean
  showSummary?: boolean
  emptyHint?: string
  starters?: React.ReactNode
  templates?: { label: string; text: string }[]
}) {
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      {/* Conversation list */}
      <div className="space-y-3">
        {starters}
        <div className="glass-card overflow-hidden">
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-500 p-5 text-center">{emptyHint}</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(15,42,79,.06)' }}>
              {conversations.map((c) => {
                const active = selected?.id === c.id
                return (
                  <Link
                    key={c.id}
                    href={`${basePath}?c=${c.id}`}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors"
                    style={{ background: active ? 'rgba(0,157,255,.1)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-dark truncate">{c.title}</span>
                      {c.flaggedCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}>
                          <Flag size={9} /> {c.flaggedCount}
                        </span>
                      )}
                      {c.status === 'resolved' && <Badge size="sm">resolved</Badge>}
                      <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{format(c.lastAt, 'd MMM')}</span>
                    </div>
                    {c.subtitle && <span className="text-xs text-slate-500 truncate">{c.subtitle}</span>}
                    <span className="text-xs text-slate-400 truncate">{c.snippet}</span>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {c.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{t}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Thread */}
      {selected ? (
        <div className="glass-card flex flex-col" style={{ height: 'min(600px, 70vh)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ borderColor: 'rgba(15,42,79,.08)' }}>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-dark">{selected.title}</p>
              {selected.subtitle && <p className="text-xs text-slate-500">{selected.subtitle}</p>}
            </div>
            {showFlags && <PriorityToggle conversationId={selected.id} initial={selected.priority ?? false} />}
          </div>

          {showSummary && selected.summary && (
            <div className="mx-4 mt-3 p-3.5 rounded-2xl flex gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,157,255,.18), rgba(124,92,255,.2))', border: '1px solid rgba(124,92,255,.28)', boxShadow: '0 10px 24px -18px rgba(124,92,255,.5)' }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)', boxShadow: '0 4px 10px -3px rgba(124,92,255,.6)' }}>
                <Sparkles size={14} />
              </div>
              <div>
                <p className="text-[11px] font-bold" style={{ color: '#6D28D9' }}>Elliot&apos;s summary</p>
                <p className="text-xs text-slate-700 leading-relaxed">{selected.summary}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {selected.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                <span className="text-[11px] text-slate-400 mb-0.5 px-1">{m.senderName} · {format(m.createdAt, 'd MMM HH:mm')}</span>
                {m.body && (
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      m.mine
                        ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' }
                        : { background: 'rgba(255,255,255,.75)', color: '#182030', border: '1px solid rgba(255,255,255,.7)' }
                    }
                  >
                    {m.body}
                  </div>
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mt-1 max-w-[80%] ${m.mine ? 'justify-end' : ''}`}>
                    {m.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ border: '1px solid rgba(15,42,79,.12)' }} title={a.originalName ?? 'Open image'}>
                        <img src={a.url} alt={a.originalName ?? 'Shared image'} className="max-w-[200px] max-h-[200px] object-cover block" />
                      </a>
                    ))}
                  </div>
                )}
                {showFlags && m.flagged && (
                  <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]" style={{ background: 'rgba(220,38,38,.08)', color: SEVERITY_COLOR[m.flagSeverity ?? 'low'] }}>
                    <ShieldAlert size={12} />
                    <span className="font-semibold capitalize">{m.flagCategory}</span>
                    <span className="text-slate-500">· {m.flagSeverity}</span>
                    {m.flagReason && <span className="text-slate-500">· {m.flagReason}</span>}
                    <span className="text-slate-300">·</span>
                    <ReleaseFlagButton messageId={m.id} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {selected.canReply ? (
            <Composer conversationId={selected.id} placeholder={selected.composerPlaceholder} templates={templates} />
          ) : (
            <div className="p-3 border-t text-center text-xs text-slate-400" style={{ borderColor: 'rgba(15,42,79,.08)' }}>
              Monitoring only - you are not a participant in this conversation.
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card glass-card-pad flex items-center justify-center text-sm text-slate-400" style={{ minHeight: 240 }}>
          Select a conversation to view it.
        </div>
      )}
    </div>
  )
}
