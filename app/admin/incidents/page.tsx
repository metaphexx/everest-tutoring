import { format } from 'date-fns'
import { ShieldAlert } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { prisma } from '@/lib/db'
import IncidentForm from './IncidentForm'
import { resolveIncident } from './actions'

export const metadata = { title: 'Incidents - Admin' }
export const dynamic = 'force-dynamic'

const SEV: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' }

export default async function IncidentsPage() {
  const incidents = await prisma.incident.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] })
  const open = incidents.filter((i) => i.status === 'open').length

  async function resolve(formData: FormData) {
    'use server'
    await resolveIncident(String(formData.get('id')))
  }

  return (
    <AdminShell sub="Incidents">
      <div className="flex items-center gap-2">
        <ShieldAlert size={20} className="text-red-600" />
        <h1 className="portal-title">Incident log</h1>
      </div>
      <p className="portal-lede">{open > 0 ? `${open} open` : 'Safeguarding, behaviour and injury records'} - restricted, for duty of care.</p>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5 mt-5">
        <div className="glass-card glass-card-pad h-fit">
          <h2 className="portal-section-title mb-3">Log an incident</h2>
          <IncidentForm />
        </div>

        <div className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">History</h2>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500">No incidents logged.</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((i) => (
                <div key={i.id} className="p-3 rounded-xl" style={{ background: i.status === 'open' ? 'rgba(220,38,38,.05)' : 'rgba(255,255,255,.5)', border: `1px solid ${i.status === 'open' ? 'rgba(220,38,38,.15)' : 'rgba(15,42,79,.06)'}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SEV[i.severity] ?? SEV.low}`}>{i.severity}</span>
                    <span className="text-sm font-semibold text-dark capitalize">{i.category}</span>
                    {i.studentName && <span className="text-xs text-slate-500">· {i.studentName}</span>}
                    <span className="ml-auto text-xs text-slate-400">{format(i.createdAt, 'd MMM, h:mmaaa')}</span>
                  </div>
                  <p className="text-sm text-slate-600">{i.details}</p>
                  {i.actionTaken && <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Action:</span> {i.actionTaken}</p>}
                  {i.status === 'open' ? (
                    <form action={resolve} className="mt-2">
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="text-xs font-semibold text-primary">Mark resolved</button>
                    </form>
                  ) : (
                    <span className="text-[11px] text-green-700 font-medium mt-1 inline-block">✓ resolved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
