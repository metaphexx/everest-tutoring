import { format } from 'date-fns'
import { Repeat, CalendarClock, XCircle, HelpCircle } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { prisma } from '@/lib/db'
import RequestRow from './RequestRow'

export const metadata = { title: 'Requests - Admin' }
export const dynamic = 'force-dynamic'

const TYPE: Record<string, { label: string; Icon: typeof Repeat; color: string }> = {
  makeup: { label: 'Make-up', Icon: Repeat, color: '#009dff' },
  reschedule: { label: 'Reschedule', Icon: CalendarClock, color: '#7C3AED' },
  cancel: { label: 'Cancellation', Icon: XCircle, color: '#dc2626' },
  other: { label: 'Request', Icon: HelpCircle, color: '#64748b' },
}

export default async function AdminRequestsPage() {
  const requests = await prisma.serviceRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] })
  const open = requests.filter((r) => r.status === 'open').length

  return (
    <AdminShell sub="Requests">
      <h1 className="portal-title">Parent requests</h1>
      <p className="portal-lede">{open > 0 ? `${open} awaiting action` : 'Make-up, reschedule and cancellation requests from parents.'}</p>

      <div className="glass-card glass-card-pad mt-5">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const t = TYPE[r.type] ?? TYPE.other
              return (
                <div key={r.id} className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}1A`, color: t.color }}>
                      <t.Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark">
                        {t.label}
                        {r.studentName ? ` · ${r.studentName}` : ''}
                        {r.subjectName ? ` · ${r.subjectName}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">From {r.parentName ?? 'parent'}{r.preferredDate ? ` · preferred ${format(r.preferredDate, 'EEE d MMM')}` : ''} · {format(r.createdAt, 'd MMM')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{r.details}</p>
                  <RequestRow id={r.id} status={r.status} adminNote={r.adminNote} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
