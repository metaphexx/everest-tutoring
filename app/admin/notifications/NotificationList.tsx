'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { UserPlus, MessageSquare, AlertTriangle, FileText, CreditCard, CalendarCheck, Repeat, Bell } from 'lucide-react'
import { markRead } from './actions'

type Item = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
}

const ICONS: Record<string, typeof Bell> = {
  referral: UserPlus,
  support: MessageSquare,
  flag: AlertTriangle,
  outline: FileText,
  booking: CalendarCheck,
  payment: CreditCard,
  request: Repeat,
  system: Bell,
}
const TINT: Record<string, string> = {
  referral: '#7C3AED',
  support: '#009dff',
  flag: '#dc2626',
  outline: '#0D9488',
  booking: '#16a34a',
  payment: '#d97706',
  request: '#009dff',
  system: '#64748b',
}

export default function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter()
  const [, start] = useTransition()

  const open = (n: Item) => {
    start(async () => {
      if (!n.read) await markRead(n.id)
      if (n.href) router.push(n.href)
      else router.refresh()
    })
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">You are all caught up. New activity from any tab shows up here.</p>
  }

  return (
    <div className="space-y-2">
      {items.map((n) => {
        const Icon = ICONS[n.type] ?? Bell
        const tint = TINT[n.type] ?? '#64748b'
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => open(n)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors"
            style={{ background: n.read ? 'rgba(255,255,255,.45)' : 'rgba(0,157,255,.08)', border: `1px solid ${n.read ? 'rgba(15,42,79,.06)' : 'rgba(0,157,255,.2)'}` }}
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tint}1A`, color: tint }}>
              <Icon size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EC4899' }} />}
                <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-semibold text-dark'}`}>{n.title}</p>
                <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{n.createdAt}</span>
              </div>
              {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
