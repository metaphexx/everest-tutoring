import { Sparkles } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import { elliotStatus } from '@/lib/elliot'
import ElliotChat from './ElliotChat'

export const metadata = { title: 'Elliot · AI assistant' }
export const dynamic = 'force-dynamic'

export default async function ElliotPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const status = elliotStatus()

  return (
    <AdminShell sub="Elliot · AI assistant">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#009dff,#7C3AED)' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="portal-title" style={{ margin: 0 }}>Elliot</h1>
          <p className="text-sm text-slate-500">
            Your CRM assistant ·{' '}
            {status.live ? (
              <span className="text-green-600 font-medium">live ({status.model})</span>
            ) : (
              <span className="text-slate-500 font-medium">preview mode</span>
            )}
          </p>
        </div>
      </div>

      <p className="portal-lede mt-2">
        Ask about your students, attendance, classes or communications. Elliot answers from your live data and can draft messages and reports for you to review - it never sends anything without your confirmation.
      </p>

      <div className="mt-5">
        <ElliotChat live={status.live} initialQuery={q} />
      </div>
    </AdminShell>
  )
}
