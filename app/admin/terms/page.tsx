import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { CalendarRange } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { weeksRemaining } from '@/lib/term'
import TermForm from './TermForm'

export const metadata = { title: 'Terms - Admin' }
export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const terms = await prisma.term.findMany({ orderBy: { startDate: 'asc' } })

  return (
    <AdminShell sub="Terms">
      <div className="flex items-center gap-2.5">
        <CalendarRange size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>Terms &amp; billing dates</h1>
      </div>
      <p className="portal-lede mt-1">
        Term dates drive all billing and pro-rata pricing. Dates differ every term, so edit them here - no code changes needed.
      </p>

      <div className="space-y-4 mt-5">
        {terms.map((t) => (
          <div key={t.id}>
            <p className="text-xs text-slate-400 mb-1.5 ml-1">
              {format(t.startDate, 'd MMM yyyy')} → {format(t.endDate, 'd MMM yyyy')} · {t.weeks} weeks
              {t.isActive && <> · <span className="text-green-600 font-medium">{weeksRemaining(t)} weeks remaining now</span></>}
            </p>
            <TermForm term={{ id: t.id, name: t.name, startISO: t.startDate.toISOString(), endISO: t.endDate.toISOString(), weeks: t.weeks, year: t.year, termNumber: t.termNumber, isActive: t.isActive }} />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <TermForm />
      </div>
    </AdminShell>
  )
}
