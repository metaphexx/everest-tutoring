import Link from 'next/link'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { ScrollText, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import RevertButton from '@/components/admin/RevertButton'
import { EmptyState } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SignInActivity from '@/components/admin/SignInActivity'
import { verifyAuditChain } from '@/lib/audit-verify'
import { uaSummary } from '@/lib/device-watch'

export const metadata = { title: 'Activity log - Admin' }
export const dynamic = 'force-dynamic'

// Legacy hand-written actions keep their friendly labels.
const ACTION_LABEL: Record<string, string> = {
  'class.cancel': 'Cancelled a class',
  'class.substitute': 'Assigned a substitute',
  'credit.grant': 'Issued account credit',
  'parent.changeEmail': 'Changed login email',
  'parent.delete': 'Erased parent data',
  'withdrawal.process': 'Processed withdrawal',
  'message.releaseFlag': 'Released a flagged message',
  'moderation.reportToParent': 'Reported a message to a parent',
  'tutor.autoSuspend': 'Auto-suspended a tutor',
}

const ENTITY_NOUN: Record<string, string> = {
  Student: 'student', User: 'user', Subject: 'class', Booking: 'booking', Enrollment: 'enrolment',
  Term: 'term', StudentNote: 'student note', StudentCredit: 'account credit', ServiceRequest: 'request',
  WithdrawalRequest: 'withdrawal', Incident: 'incident', Referral: 'referral', Waitlist: 'waitlist entry',
  Report: 'report', Announcement: 'announcement', TutorResource: 'resource',
}
const KIND_VERB: Record<string, string> = { create: 'Added', update: 'Edited', delete: 'Removed' }
const KIND_COLOR: Record<string, string> = { create: 'bg-green-100 text-green-700', update: 'bg-sky-100 text-sky-700', delete: 'bg-red-100 text-red-700', action: 'bg-violet-100 text-violet-700' }

function labelFor(l: { action: string; kind: string | null; entity: string | null }) {
  if (ACTION_LABEL[l.action]) return ACTION_LABEL[l.action]
  if (l.kind && l.entity) return `${KIND_VERB[l.kind] ?? l.kind} ${ENTITY_NOUN[l.entity] ?? l.entity.toLowerCase()}`
  return l.action
}

// The fields that meaningfully changed in an update (skip noisy timestamps).
const SKIP = new Set(['updatedAt', 'createdAt', 'lastMessageAt', 'aiSummary'])
function diffFields(before: string | null, after: string | null): { field: string; from: unknown; to: unknown }[] {
  if (!before || !after) return []
  try {
    const b = JSON.parse(before) as Record<string, unknown>
    const a = JSON.parse(after) as Record<string, unknown>
    const out: { field: string; from: unknown; to: unknown }[] = []
    for (const k of Object.keys(a)) {
      if (SKIP.has(k)) continue
      if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push({ field: k, from: b[k], to: a[k] })
    }
    return out.slice(0, 6)
  } catch { return [] }
}
function short(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const s = String(v)
  return s.length > 28 ? `${s.slice(0, 28)}…` : s
}

const KINDS = [['', 'All'], ['create', 'Added'], ['update', 'Edited'], ['delete', 'Removed']] as const

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ kind?: string; actor?: string }> }) {
  const { kind, actor } = await searchParams
  const where = {
    ...(kind ? { kind } : {}),
    ...(actor ? { actorId: actor } : {}),
  }
  const [logs, actors, integrity] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 250 }),
    prisma.auditLog.findMany({ where: { actorId: { not: null } }, select: { actorId: true, actorName: true }, distinct: ['actorId'], take: 30 }),
    verifyAuditChain(),
  ])

  return (
    <AdminShell sub="Activity log">
      <div className="flex items-center gap-2.5">
        <ScrollText size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Activity log</h1>
      </div>
      <p className="portal-lede mt-1">Every change made in the CRM - who did it, before and after, with one-click undo. Append-only and tamper-evident.</p>

      {/* Integrity banner + trash link */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {integrity.ok ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700" style={{ border: '1px solid rgba(22,163,74,.2)' }}>
            <ShieldCheck size={14} /> History verified - {integrity.checked} record{integrity.checked === 1 ? '' : 's'} intact
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-700" style={{ border: '1px solid rgba(220,38,38,.25)' }}>
            <ShieldAlert size={14} /> Tamper detected: {integrity.reason}
          </span>
        )}
        <Link href="/admin/trash" className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full text-slate-600 hover:bg-white/70" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.7)' }}>
          <Trash2 size={14} /> Trash
        </Link>
      </div>

      <SignInActivity />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mt-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)' }}>
          {KINDS.map(([v, label]) => {
            const active = (kind ?? '') === v
            return <Link key={v} href={`/admin/audit${v ? `?kind=${v}` : ''}${actor ? `${v ? '&' : '?'}actor=${actor}` : ''}`} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={active ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>{label}</Link>
          })}
        </div>
        {actors.length > 0 && (
          <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)' }}>
            <Link href={`/admin/audit${kind ? `?kind=${kind}` : ''}`} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={!actor ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>Everyone</Link>
            {actors.map((a) => (
              <Link key={a.actorId} href={`/admin/audit?actor=${a.actorId}${kind ? `&kind=${kind}` : ''}`} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={actor === a.actorId ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>{a.actorName ?? 'Unknown'}</Link>
            ))}
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="glass-card mt-4">
          <EmptyState icon={<ScrollText size={28} />} title="No activity yet" hint="Every create, edit and deletion across the CRM will appear here, attributed to whoever made it." />
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="glass-card mt-4 overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'rgba(255,255,255,.4)' }}>
                    {['When', 'Action', 'Who', 'What changed', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const changes = l.kind === 'update' ? diffFields(l.before, l.after) : []
                    const revertable = !l.reverted && !!l.entity && !!l.entityId && (l.kind === 'create' || l.kind === 'update' || l.kind === 'delete')
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap align-top">{format(l.createdAt, 'd MMM, h:mma')}</td>
                        <td className="px-5 py-3.5 align-top">
                          <Badge size="sm" className={KIND_COLOR[l.kind ?? 'action'] ?? 'bg-slate-100 text-slate-600'}>{labelFor(l)}</Badge>
                        </td>
                        <td className="px-5 py-3.5 align-top">
                          <span className="text-dark">{l.actorName ?? '—'}</span>
                          {l.actorRole && <span className="ml-1.5 text-[10px] text-slate-500 uppercase">{l.actorRole}</span>}
                          {(l.ip || l.userAgent) && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{[uaSummary(l.userAgent), l.ip].filter(Boolean).join(' · ')}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top text-xs text-slate-500 max-w-[24rem]">
                          {l.kind === 'update' && changes.length > 0 ? (
                            <div className="space-y-0.5">
                              {changes.map((c) => (
                                <div key={c.field}><span className="font-semibold text-slate-600">{c.field}</span>: <span className="text-slate-400">{short(c.from)}</span> → <span className="text-dark">{short(c.to)}</span></div>
                              ))}
                            </div>
                          ) : (
                            <span>{l.target ?? l.detail ?? (l.entityId ? `${l.entity} ${l.entityId.slice(0, 6)}` : '')}</span>
                          )}
                          {l.reverted && <Badge size="sm" className="ml-1 bg-slate-100 text-slate-500">reverted</Badge>}
                        </td>
                        <td className="px-5 py-3.5 align-top text-right">{revertable && <RevertButton id={l.id} />}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="mt-4 space-y-2.5 sm:hidden">
            {logs.map((l) => {
              const changes = l.kind === 'update' ? diffFields(l.before, l.after) : []
              const revertable = !l.reverted && !!l.entity && !!l.entityId && (l.kind === 'create' || l.kind === 'update' || l.kind === 'delete')
              return (
                <div key={`m:${l.id}`} className="glass-card glass-card-pad">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge size="sm" className={KIND_COLOR[l.kind ?? 'action'] ?? 'bg-slate-100 text-slate-600'}>{labelFor(l)}</Badge>
                    {l.reverted && <Badge size="sm" className="bg-slate-100 text-slate-500">reverted</Badge>}
                    <span className="ml-auto text-xs text-[var(--muted)]">{format(l.createdAt, 'd MMM, h:mma')}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-dark font-semibold">{l.actorName ?? '—'}</span>
                    {l.actorRole && <span className="ml-1.5 text-[10px] text-slate-500 uppercase">{l.actorRole}</span>}
                    {(l.ip || l.userAgent) && <div className="text-[11px] text-slate-400">{[uaSummary(l.userAgent), l.ip].filter(Boolean).join(' · ')}</div>}
                  </div>
                  {l.kind === 'update' && changes.length > 0 ? (
                    <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                      {changes.map((c) => (
                        <div key={c.field}><span className="font-semibold text-slate-600">{c.field}</span>: <span className="text-slate-400">{short(c.from)}</span> → <span className="text-dark">{short(c.to)}</span></div>
                      ))}
                    </div>
                  ) : (l.target || l.detail) ? (
                    <div className="mt-2 text-xs text-slate-500">{l.target ?? l.detail}</div>
                  ) : null}
                  {revertable && <div className="mt-3"><RevertButton id={l.id} /></div>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </AdminShell>
  )
}
