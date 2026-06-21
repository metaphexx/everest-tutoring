import { format } from 'date-fns'
import { MonitorSmartphone } from 'lucide-react'
import { prisma } from '@/lib/db'
import { uaSummary } from '@/lib/device-watch'

/**
 * Surfaces the device/network provenance captured on sign-in (KnownDevice) as a
 * compact "sign-in activity" panel - who signed in, from what device/IP, and
 * when that device was first seen. The first device per account is silent; a new
 * device on an established account also raises an admin notification
 * (lib/device-watch.ts).
 */
export default async function SignInActivity({ limit = 8 }: { limit?: number }) {
  const devices = await prisma.knownDevice.findMany({ orderBy: { lastSeenAt: 'desc' }, take: limit })
  if (devices.length === 0) return null

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(devices.map((d) => d.userId))] } },
    select: { id: true, name: true, role: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  // Count devices per user so we can flag accounts signing in from several.
  const counts = new Map<string, number>()
  for (const d of devices) counts.set(d.userId, (counts.get(d.userId) ?? 0) + 1)

  return (
    <div className="glass-card glass-card-pad mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MonitorSmartphone size={16} className="text-primary" />
        <h2 className="portal-section-title" style={{ margin: 0 }}>Sign-in activity</h2>
        <span className="ml-auto text-[11px] text-slate-400">device + network per account</span>
      </div>
      <ol className="space-y-2">
        {devices.map((d) => {
          const u = byId.get(d.userId)
          const multi = (counts.get(d.userId) ?? 0) > 1
          return (
            <li key={d.id} className="flex items-center gap-2.5 text-sm">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: multi ? '#f59e0b' : '#22c55e' }} title={multi ? 'Signs in from multiple devices' : 'Single device'} />
              <span className="text-dark font-medium">{u?.name ?? 'Unknown'}</span>
              {u?.role && <span className="text-[10px] text-slate-500 uppercase">{u.role}</span>}
              <span className="text-slate-500">{uaSummary(d.userAgent)}</span>
              {d.ip && <span className="text-xs text-slate-400">{d.ip}</span>}
              <span className="ml-auto text-[11px] text-slate-400">first seen {format(d.createdAt, 'd MMM, h:mma')}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
