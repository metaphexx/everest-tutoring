import Link from 'next/link'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { Users, Mail, Phone } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import WinbackComposer from './WinbackComposer'
import MarketingOptOutToggle from './MarketingOptOutToggle'

export const metadata = { title: 'Alumni - Admin' }
export const dynamic = 'force-dynamic'

const money = (c: number) => `$${(c / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`
const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function AlumniPage() {
  const alumni = await prisma.user.findMany({
    where: { role: 'parent', lifecycleStage: 'alumni' },
    orderBy: { alumniSince: 'desc' },
    include: {
      students: { orderBy: { createdAt: 'asc' } },
      bookings: { where: { paymentStatus: { in: ['paid', 'disputed'] } }, select: { totalAmountCents: true, termId: true } },
    },
  })

  const reachable = alumni.filter((a) => !a.marketingOptOut).length
  const totalPast = alumni.reduce((s, a) => s + a.bookings.reduce((x, b) => x + b.totalAmountCents, 0), 0)

  return (
    <AdminShell sub="Alumni">
      <div className="flex items-center gap-2.5">
        <Users size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Alumni / win-back</h1>
      </div>
      <p className="portal-lede mt-1">Former families, kept on file to win back. {alumni.length} alumni · {money(totalPast)} historic value · {reachable} reachable.</p>

      {alumni.length > 0 && (
        <div className="mt-5"><WinbackComposer reachable={reachable} /></div>
      )}

      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Family', 'Students', 'Lifetime value', 'Left', 'Reason', 'Marketing'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumni.map((a) => {
                const ltv = a.bookings.reduce((s, b) => s + b.totalAmountCents, 0)
                const reasons = [...new Set(a.students.map((s) => s.exitReason).filter(Boolean))] as string[]
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-dark">{a.name ?? 'A family'}</p>
                      {a.email && <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary"><Mail size={11} /> {a.email}{a.emailOptOut && <span className="text-red-400">(opted out)</span>}</a>}
                      {a.phone && <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary"><Phone size={11} /> {a.phone}{a.smsOptOut && <span className="text-red-400">(STOP)</span>}</a>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {a.students.map((s) => (
                          <Link key={s.id} href={`/admin/students/${s.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium hover:opacity-80" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: YEAR_COLORS[s.yearLevel] ?? '#009dff' }} />
                            {s.firstName} <span className="text-slate-400">Y{s.yearLevel}</span>
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-dark">{money(ltv)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{a.alumniSince ? format(a.alumniSince, 'MMM yyyy') : '-'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-[14rem]">{reasons.length ? reasons.join('; ') : <span className="text-slate-300">-</span>}</td>
                    <td className="px-5 py-4"><MarketingOptOutToggle parentId={a.id} optedOut={a.marketingOptOut} /></td>
                  </tr>
                )
              })}
              {alumni.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-300">No alumni yet. Families appear here after a withdrawal is processed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
