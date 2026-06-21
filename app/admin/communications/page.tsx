import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Mail, MessageSquare, ArrowDownLeft } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { hasResend, hasTwilio } from '@/lib/notify'

export const metadata = { title: 'Communications | Admin' }
export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  preview: 'bg-slate-100 text-slate-600',
  skipped: 'bg-slate-100 text-slate-500',
  received: 'bg-sky-100 text-sky-700',
  'opt-out': 'bg-red-100 text-red-700',
  'opt-in': 'bg-green-100 text-green-700',
}

export default async function CommunicationsPage() {
  const [notifications, byType] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.notification.groupBy({ by: ['type'], _count: true }),
  ])

  return (
    <AdminShell sub="Communications log">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="portal-title">Communications</h1>
          <p className="portal-lede">Every reminder, alert and message - sent, previewed, or replies received back. Inbound replies need the Twilio/email webhook wired up (see DEV_NOTES).</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: hasResend ? 'rgba(22,163,74,.12)' : 'rgba(100,116,139,.12)', color: hasResend ? '#16a34a' : '#64748b' }}>
            Email: {hasResend ? 'live' : 'preview mode'}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: hasTwilio ? 'rgba(22,163,74,.12)' : 'rgba(100,116,139,.12)', color: hasTwilio ? '#16a34a' : '#64748b' }}>
            SMS: {hasTwilio ? 'live' : 'preview mode'}
          </span>
        </div>
      </div>

      {byType.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {byType.map((t) => (
            <span key={t.type} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.6)' }}>
              {t.type}: <span className="text-primary font-semibold">{t._count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="glass-card glass-card-pad mt-5">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No communications yet. Reminders appear here once they run.</p>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((n) => {
              const inbound = n.type === 'inbound'
              return (
              <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: inbound ? 'rgba(22,163,74,.06)' : 'rgba(255,255,255,.5)' }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={inbound ? { background: 'rgba(22,163,74,.12)', color: '#16a34a' } : { background: 'rgba(0,157,255,.1)', color: '#009dff' }}>
                  {inbound ? <ArrowDownLeft size={16} /> : n.channel === 'email' ? <Mail size={16} /> : <MessageSquare size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">
                    {inbound && <span className="text-green-700 font-semibold">Reply from {n.recipient} · </span>}
                    {n.subject ?? n.body}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{n.body}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge size="sm" className={STATUS_STYLE[n.status] ?? 'bg-slate-100 text-slate-600'}>{inbound ? `inbound · ${n.status}` : n.status}</Badge>
                  <p className="text-[11px] text-slate-400 mt-1">{n.channel} · {format(new Date(n.createdAt), 'd MMM HH:mm')}</p>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
