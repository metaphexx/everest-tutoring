import Link from 'next/link'
import { Search } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { unreadAdminCount } from '@/lib/admin-notify'
import PortalShell from './PortalShell'
import AdminNav from './AdminNav'
import NotificationBell from './NotificationBell'
import ElliotCommandBar from './ElliotCommandBar'
import { Tooltip } from '@/components/ui/tooltip'

// Shared chrome for every admin page: the brand PortalShell (glassy header + logo),
// a vertical section nav down the side, and a top-right search + notifications row.
export default async function AdminShell({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const user = await requireUser(['admin'])
  const unread = await unreadAdminCount()
  return (
    <PortalShell eyebrow="Admin" sub={sub ?? 'Everest CRM'} user={user}>
      {/* Utility row: Ask Elliot command bar + quick search + notifications */}
      <div className="flex items-center gap-2 mb-4">
        <ElliotCommandBar />
        <Tooltip label="Search students, parents, tutors and classes">
          <Link
            href="/admin/search"
            aria-label="Search the CRM"
            className="w-11 h-11 rounded-full flex items-center justify-center text-primary transition-colors hover:bg-white/70"
            style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.7)' }}
          >
            <Search size={18} />
          </Link>
        </Tooltip>
        <NotificationBell count={unread} />
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-[208px] lg:flex-shrink-0 lg:sticky lg:top-[84px] lg:self-start">
          <AdminNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </PortalShell>
  )
}
