'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, GraduationCap, CalendarCheck, ShoppingCart, Inbox,
  HeartHandshake, BookOpen, Clock, FileText, MessagesSquare, Megaphone, CalendarRange,
  Users, School, AlertTriangle, History, Sparkles, MessageCircleQuestion, FolderOpen,
  Library, ShieldAlert, Gauge,
} from 'lucide-react'

const TABS = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/admin/students', label: 'Students', Icon: GraduationCap },
  { href: '/admin/questions', label: 'Questions', Icon: MessageCircleQuestion },
  { href: '/admin/moderation', label: 'Moderation', Icon: ShieldAlert },
  { href: '/admin/school-materials', label: 'Materials', Icon: FolderOpen },
  { href: '/admin/resources', label: 'Resources', Icon: Library },
  { href: '/admin/bookings', label: 'Bookings', Icon: CalendarCheck },
  { href: '/admin/abandoned', label: 'Carts', Icon: ShoppingCart },
  { href: '/admin/requests', label: 'Requests', Icon: Inbox },
  { href: '/admin/retention', label: 'Retention', Icon: HeartHandshake },
  { href: '/admin/classes', label: 'Classes', Icon: BookOpen },
  { href: '/admin/waitlist', label: 'Waitlist', Icon: Clock },
  { href: '/admin/reports', label: 'Reports', Icon: FileText },
  { href: '/admin/messages', label: 'Messages', Icon: MessagesSquare },
  { href: '/admin/communications', label: 'Comms', Icon: Megaphone },
  { href: '/admin/terms', label: 'Terms', Icon: CalendarRange },
  { href: '/admin/alumni', label: 'Alumni', Icon: Users },
  { href: '/admin/partner', label: 'HSHS', Icon: School },
  { href: '/admin/incidents', label: 'Incidents', Icon: AlertTriangle },
  { href: '/admin/audit', label: 'Activity', Icon: History },
  { href: '/admin/ai-usage', label: 'AI usage', Icon: Gauge },
  { href: '/admin/elliot', label: 'Elliot ✨', Icon: Sparkles },
]

// Vertical section nav for the CRM (a horizontal-scroll strip on mobile). Glassy
// to match the rest of the portal chrome.
export default function AdminNav() {
  const path = usePathname()
  return (
    <nav
      className="flex flex-row lg:flex-col gap-1 p-1.5 rounded-2xl overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto no-scrollbar lg:max-h-[calc(100vh-110px)]"
      style={{
        background: 'rgba(255,255,255,.5)',
        border: '1px solid rgba(255,255,255,.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 12px 30px -24px rgba(15,42,79,.5)',
      }}
    >
      {TABS.map((t) => {
        const active = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active}
            className="flex items-center gap-2.5 px-3.5 py-2.5 min-h-11 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 whitespace-nowrap lg:w-full"
            style={
              active
                ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff', boxShadow: '0 8px 18px -10px rgba(0,157,255,.6)' }
                : { color: '#404B5C' }
            }
          >
            <t.Icon size={16} className="flex-shrink-0" style={active ? undefined : { color: '#94a3b8' }} />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
