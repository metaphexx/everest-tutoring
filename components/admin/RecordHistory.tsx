import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { History } from 'lucide-react'
import { prisma } from '@/lib/db'

/**
 * "This record's change log" - every audited change to one record (and, when
 * given, its child records) on the record's own detail page. Reuses the global
 * audit trail, scoped by entity + entityId.
 */

const KIND_VERB: Record<string, string> = { create: 'Created', update: 'Edited', delete: 'Removed' }
const KIND_COLOR: Record<string, string> = { create: 'bg-green-100 text-green-700', update: 'bg-sky-100 text-sky-700', delete: 'bg-red-100 text-red-700' }
const SKIP = new Set(['updatedAt', 'createdAt', 'lastMessageAt', 'aiSummary', 'deletedAt'])

function changed(before: string | null, after: string | null): string[] {
  if (!before || !after) return []
  try {
    const b = JSON.parse(before) as Record<string, unknown>
    const a = JSON.parse(after) as Record<string, unknown>
    return Object.keys(a).filter((k) => !SKIP.has(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k])).slice(0, 5)
  } catch { return [] }
}

export default async function RecordHistory({
  entity, entityId, related, childLabel,
}: {
  entity: string
  entityId: string
  related?: { entity: string; ids: string[] }[]
  childLabel?: Record<string, string>
}) {
  const ors: { entity: string; entityId: { in: string[] } }[] = [{ entity, entityId: { in: [entityId] } }]
  for (const r of related ?? []) if (r.ids.length) ors.push({ entity: r.entity, entityId: { in: r.ids } })

  const logs = await prisma.auditLog.findMany({
    where: { OR: ors },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  return (
    <div className="glass-card glass-card-pad mt-5">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-primary" />
        <h2 className="portal-section-title" style={{ margin: 0 }}>Change history</h2>
        <span className="ml-auto text-[11px] text-slate-400">{logs.length} recent</span>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400">No changes recorded for this record yet.</p>
      ) : (
        <ol className="space-y-2.5">
          {logs.map((l) => {
            const fields = l.kind === 'update' ? changed(l.before, l.after) : []
            const what = childLabel?.[l.entity ?? ''] ?? (l.entity === entity ? '' : l.entity?.toLowerCase() ?? '')
            return (
              <li key={l.id} className="flex items-start gap-2.5 text-sm">
                <Badge size="sm" className={`mt-0.5 whitespace-nowrap ${KIND_COLOR[l.kind ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>{KIND_VERB[l.kind ?? ''] ?? l.kind}</Badge>
                <div className="min-w-0">
                  <div className="text-slate-600">
                    {what && <span className="text-slate-400">{what} </span>}
                    {l.reverted && <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 ml-1">reverted</span>}
                    {fields.length > 0 && <span className="text-slate-500">{fields.join(', ')}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">{l.actorName ?? 'System'} · {format(l.createdAt, 'd MMM yyyy, h:mma')}</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
