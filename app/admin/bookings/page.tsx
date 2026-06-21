import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import AdminShell from '@/components/portal/AdminShell'
import InvoiceButton from './InvoiceButton'
import RolloverControl from './RolloverControl'

export const metadata = { title: 'Bookings - Admin' }
export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      term: true,
      enrollments: { include: { subject: true, student: true } },
    },
  })

  const paid = bookings.filter((b) => b.paymentStatus === 'paid')
  const revenue = paid.reduce((sum, b) => sum + b.totalAmountCents, 0) / 100

  return (
    <AdminShell sub="Bookings">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="portal-title">Bookings</h1>
          <p className="portal-lede">{bookings.length} total · Term 3 2026</p>
        </div>
        <RolloverControl />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        {[
          { label: 'Total bookings', value: bookings.length, color: '#009dff' },
          { label: 'Paid', value: paid.length, color: '#16a34a' },
          { label: 'Revenue', value: `$${revenue.toFixed(0)}`, color: '#EC4899' },
        ].map((s) => (
          <div key={s.label} className="glass-stat">
            <div className="glass-stat-label">{s.label}</div>
            <div className="glass-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Code', 'Parent', 'Students', 'Subjects', 'Weeks', 'Amount', 'Status', 'Invoice', 'Date'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const studentNames = [...new Set(b.enrollments.map((e) => `${e.student.firstName} (Y${e.subject.yearLevel})`))]
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-dark">{b.confirmationCode ?? '-'}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-dark">{b.user?.name}</p>
                      <p className="text-xs text-slate-400">{b.user?.email}</p>
                      {b.user?.phone && <p className="text-xs text-slate-400">{b.user.phone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {studentNames.map((n) => (
                          <span key={n} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{n}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{b.subjectsPerWeek}/wk</td>
                    <td className="px-5 py-4 text-slate-600">{b.weeksRemaining}</td>
                    <td className="px-5 py-4 font-semibold text-dark">${(b.totalAmountCents / 100).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <Badge variant={b.paymentStatus === 'paid' ? 'success' : 'warning'}>{b.paymentStatus}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {b.xeroStatus === 'invoiced' ? (
                        <Badge variant="info">{b.xeroInvoiceNumber ?? 'invoiced'}</Badge>
                      ) : b.xeroStatus === 'preview' ? (
                        <Badge variant="neutral" title="Xero is in preview mode - add credentials to push live">preview</Badge>
                      ) : b.xeroStatus === 'failed' ? (
                        <Badge variant="danger">failed</Badge>
                      ) : b.paymentStatus === 'paid' ? (
                        <InvoiceButton bookingId={b.id} />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{format(new Date(b.createdAt), 'dd MMM yyyy')}</td>
                  </tr>
                )
              })}
              {bookings.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-300">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
