import { Gauge } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { EmptyState } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { usageSummary, budgetCents, monthlyCostCents } from '@/lib/ai-cost'
import type { AiTask } from '@/lib/ai'

export const metadata = { title: 'AI usage - Admin' }
export const dynamic = 'force-dynamic'

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
const TASK_LABEL: Record<string, string> = {
  moderation: 'Moderation', summary: 'Summaries', copilot: 'Elliot', report: 'Reports',
  analytics: 'Analytics', support: 'Support', draft: 'Drafts', embedding: 'Search index',
}

export default async function AiUsagePage() {
  const { rows, totalCents } = await usageSummary()
  const tasks = rows.map((r) => r.task)
  const budgets = await Promise.all(
    tasks.map(async (t) => ({ task: t, budget: budgetCents(t as AiTask), spent: await monthlyCostCents(t as AiTask) })),
  )
  const budgetByTask = new Map(budgets.map((b) => [b.task, b]))
  const month = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  return (
    <AdminShell sub="AI usage">
      <div className="flex items-center gap-2.5">
        <Gauge size={22} className="text-primary" />
        <h1 className="portal-title" style={{ margin: 0 }}>AI usage &amp; cost</h1>
      </div>
      <p className="portal-lede mt-1">Estimated spend per AI task for {month}, with caching and per-task monthly budgets. When a task hits its budget, the CRM automatically falls back to its built-in (non-AI) behaviour so nothing breaks.</p>

      <div className="glass-card glass-card-pad mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{money(totalCents)}</span>
        <span className="text-sm text-slate-500">estimated this month across {rows.reduce((s, r) => s + r.calls, 0)} calls</span>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card mt-4">
          <EmptyState icon={<Gauge size={28} />} title="No AI calls this month" hint="Once Elliot, moderation or the draft features run, their usage and estimated cost will show up here." />
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="glass-card mt-4 overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--hairline)]" style={{ background: 'rgba(255,255,255,.4)' }}>
                    {['Task', 'Calls', 'Cache hits', 'Tokens (in/out)', 'Cost', 'Budget'].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const b = budgetByTask.get(r.task)
                    const over = b?.budget != null && b.spent >= b.budget
                    const near = b?.budget != null && !over && b.spent >= b.budget * 0.8
                    return (
                      <TableRow key={r.task}>
                        <TableCell className="font-semibold text-dark">{TASK_LABEL[r.task] ?? r.task}</TableCell>
                        <TableCell className="text-slate-600">{r.calls}</TableCell>
                        <TableCell className="text-slate-600">{r.cached}{r.calls > 0 && <span className="text-xs text-slate-400"> ({Math.round((r.cached / r.calls) * 100)}%)</span>}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{r.inputTokens.toLocaleString()} / {r.outputTokens.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-dark">{money(r.costCents)}</TableCell>
                        <TableCell>
                          {b?.budget == null ? (
                            <span className="text-xs text-[var(--muted)]">uncapped</span>
                          ) : (
                            <Badge variant={over ? 'danger' : near ? 'warning' : 'success'} size="sm">
                              {money(b.spent)} / {money(b.budget)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="mt-4 space-y-2.5 sm:hidden">
            {rows.map((r) => {
              const b = budgetByTask.get(r.task)
              const over = b?.budget != null && b.spent >= b.budget
              const near = b?.budget != null && !over && b.spent >= b.budget * 0.8
              return (
                <div key={`m:${r.task}`} className="glass-card glass-card-pad">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-dark">{TASK_LABEL[r.task] ?? r.task}</span>
                    <span className="ml-auto font-semibold text-dark">{money(r.costCents)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-[var(--muted)]">
                    <span>Calls: <span className="text-slate-600">{r.calls}</span></span>
                    <span>Cache: <span className="text-slate-600">{r.cached}{r.calls > 0 ? ` (${Math.round((r.cached / r.calls) * 100)}%)` : ''}</span></span>
                    <span className="col-span-2">Tokens: {r.inputTokens.toLocaleString()} in / {r.outputTokens.toLocaleString()} out</span>
                  </div>
                  <div className="mt-2">
                    {b?.budget == null ? (
                      <span className="text-xs text-[var(--muted)]">Budget: uncapped</span>
                    ) : (
                      <Badge size="sm" variant={over ? 'danger' : near ? 'warning' : 'success'}>
                        {money(b.spent)} / {money(b.budget)}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 mt-3">Set budgets with environment variables, e.g. <code className="px-1 rounded bg-slate-100">AI_BUDGET_COPILOT_CENTS=2000</code> for a $20/month cap on Elliot, or <code className="px-1 rounded bg-slate-100">AI_BUDGET_CENTS</code> for a global cap. Costs are list-price estimates from token counts, for monitoring only.</p>
    </AdminShell>
  )
}
