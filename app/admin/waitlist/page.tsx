import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ListChecks, Mail, Phone } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import WaitlistComposer from './WaitlistComposer'
import OfferSeatButton from './OfferSeatButton'

export const metadata = { title: 'Waitlist - Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }
const STATUS_BADGE: Record<string, string> = {
  waiting: 'bg-slate-100 text-slate-600',
  offered: 'bg-sky-100 text-sky-700',
  claimed: 'bg-amber-100 text-amber-700',
  enrolled: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-400',
}
const STATUS_LABEL: Record<string, string> = { waiting: 'Waiting', offered: 'Offered', claimed: 'Pending payment', enrolled: 'Enrolled', expired: 'Expired' }

export default async function WaitlistPage() {
  const entries = await prisma.waitlist.findMany({
    where: { status: { in: ['waiting', 'offered', 'claimed'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: { subject: { select: { name: true, yearLevel: true } } },
  })

  // Contact info for each parent (one query).
  const parentIds = [...new Set(entries.map((e) => e.parentId))]
  const parents = await prisma.user.findMany({ where: { id: { in: parentIds } }, select: { id: true, email: true, phone: true, marketingOptOut: true } })
  const pmap = new Map(parents.map((p) => [p.id, p]))
  const reachable = parents.filter((p) => !p.marketingOptOut).length

  const counts = {
    waiting: entries.filter((e) => e.status === 'waiting').length,
    offered: entries.filter((e) => e.status === 'offered').length,
    claimed: entries.filter((e) => e.status === 'claimed').length,
  }

  return (
    <AdminShell sub="Waitlist">
      <div className="flex items-center gap-2.5">
        <ListChecks size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Waitlist</h1>
      </div>
      <p className="portal-lede mt-1">{counts.waiting} waiting · {counts.offered} offered · {counts.claimed} pending payment. Seats are offered automatically when one frees up.</p>

      <div className="mt-5"><WaitlistComposer reachable={reachable} /></div>

      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Student / family', 'Class', 'Contact', 'Status', 'Joined', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const p = pmap.get(e.parentId)
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-dark">{e.studentName ?? e.parentName ?? 'A family'}</p>
                      {e.parentName && e.studentName && <p className="text-xs text-slate-400">{e.parentName}</p>}
                      {e.bookingId && <Badge variant="danger" size="sm">paid · owed a seat</Badge>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: YEAR_COLORS[e.subject.yearLevel] ?? '#009dff' }} />
                        Y{e.subject.yearLevel} {e.subject.name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p?.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary"><Mail size={11} /> {p.email}</a>}
                      {p?.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary"><Phone size={11} /> {p.phone}</a>}
                    </td>
                    <td className="px-5 py-4"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-400">{format(e.createdAt, 'd MMM')}</td>
                    <td className="px-5 py-4 text-right">{e.status === 'waiting' && <OfferSeatButton waitlistId={e.id} />}</td>
                  </tr>
                )
              })}
              {entries.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-300">No one on the waitlist right now.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
