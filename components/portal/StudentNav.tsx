'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, MessageCircleQuestion, BookOpen, FolderOpen, Library, MessagesSquare,
} from 'lucide-react'

const TABS = [
  { href: '/student', label: 'Home', Icon: Home },
  { href: '/student/ask', label: 'Ask', Icon: MessageCircleQuestion, primary: true },
  { href: '/student/classes', label: 'Classrooms', Icon: BookOpen },
  { href: '/student/school-materials', label: 'School materials', Icon: FolderOpen },
  { href: '/student/resources', label: 'Resources', Icon: Library },
  { href: '/student/messages', label: 'Messages', Icon: MessagesSquare },
]

// Section nav for the Student Learning Hub: a vertical rail on desktop, a
// horizontal-scroll strip on mobile. Matches the CRM's AdminNav chrome. The "Ask"
// item is always accented so the primary action is unmistakable.
export default function StudentNav() {
  const path = usePathname()
  return (
    <nav
      className="flex flex-row lg:flex-col gap-1 p-1.5 rounded-2xl overflow-x-auto lg:overflow-x-visible no-scrollbar"
      style={{
        background: 'rgba(255,255,255,.5)',
        border: '1px solid rgba(255,255,255,.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 12px 30px -24px rgba(15,42,79,.5)',
      }}
    >
      {TABS.map((t) => {
        const active = t.href === '/student' ? path === '/student' : path.startsWith(t.href)
        const accent = active || t.primary
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active}
            className="flex items-center gap-2.5 px-3.5 py-2.5 min-h-11 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 whitespace-nowrap lg:w-full"
            style={
              active
                ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff', boxShadow: '0 8px 18px -10px rgba(0,157,255,.6)' }
                : t.primary
                  ? { background: 'rgba(0,157,255,.1)', color: '#007ECC' }
                  : { color: '#404B5C' }
            }
          >
            <t.Icon size={16} className="flex-shrink-0" style={accent ? undefined : { color: '#94a3b8' }} />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
