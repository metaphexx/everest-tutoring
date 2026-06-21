import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { ShoppingCart } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import type { BookingFormData } from '@/types'

export const metadata = { title: 'Abandoned carts - Admin' }
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const money = (c: number) => `$${(c / 100).toLocaleString('en-AU', { minimumFractionDigits: 0 })}`

export default async function AbandonedCartsPage() {
  const carts = await prisma.pendingBooking.findMany({
    where: { status: 'started' },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  const rows = carts.map((c) => {
    let children: string[] = []
    try {
      const fd = (JSON.parse(c.payload) as { formData: BookingFormData }).formData
      children = fd.students.map((s) => `${s.firstName} (Y${s.yearLevel})`)
    } catch { /* malformed payload - show the family anyway */ }
    return { ...c, children }
  })

  const potential = rows.reduce((s, c) => s + c.totalCents, 0)

  return (
    <AdminShell sub="Carts">
      <div className="flex items-center gap-2.5">
        <ShoppingCart size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Abandoned carts</h1>
      </div>
      <p className="portal-lede mt-1">
        Families who reached payment but didn&apos;t finish. They&apos;re chased automatically by email and
        SMS (up to 3 nudges). {rows.length} open · {money(potential)} potential this term.
      </p>

      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Family', 'Children', 'Total', 'Nudges sent', 'Last activity', 'Resume link'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No open carts right now. 🎉</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-dark">{[c.parentFirstName, c.parentLastName].filter(Boolean).join(' ') || '-'}</div>
                    <div className="text-xs text-slate-400">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{c.children.join(', ') || '-'}</td>
                  <td className="px-5 py-3.5 font-semibold text-dark">{money(c.totalCents)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.remindersSent >= 3 ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                      {c.remindersSent} / 3
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDistanceToNow(c.updatedAt, { addSuffix: true })}</td>
                  <td className="px-5 py-3.5">
                    <a href={`${APP_URL}/book?resume=${c.resumeToken}`} target="_blank" rel="noopener noreferrer" className="text-primary font-medium">Open →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
