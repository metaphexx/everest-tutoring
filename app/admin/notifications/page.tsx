import { formatDistanceToNow } from 'date-fns'
import AdminShell from '@/components/portal/AdminShell'
import { listAdminNotifications } from '@/lib/admin-notify'
import NotificationList from './NotificationList'
import { markAllRead } from './actions'

export const metadata = { title: 'Notifications - Admin' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const rows = await listAdminNotifications()
  const items = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.read,
    createdAt: formatDistanceToNow(n.createdAt, { addSuffix: true }),
  }))
  const unread = rows.filter((n) => !n.read).length

  return (
    <AdminShell sub="Notifications">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="portal-title">Notifications</h1>
          <p className="portal-lede">{unread > 0 ? `${unread} unread` : 'Everything from across the CRM, in one place.'}</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)', color: '#007ECC' }}>
              Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="glass-card glass-card-pad mt-5">
        <NotificationList items={items} />
      </div>
    </AdminShell>
  )
}
