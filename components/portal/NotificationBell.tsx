import Link from 'next/link'
import { Bell } from 'lucide-react'

// Bell + unread badge for the admin shell. Count is fetched server-side and
// passed in; the bell links to the full notification centre.
export default function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/admin/notifications"
      aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
      className="relative inline-flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
      style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.7)' }}
    >
      <Bell size={18} className="text-slate-600" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
          style={{ background: '#EC4899' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
