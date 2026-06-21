import Link from 'next/link'
import { MessageCircleQuestion } from 'lucide-react'
import { requireUser } from '@/lib/session'
import PortalShell from './PortalShell'
import StudentNav from './StudentNav'

// Shared chrome for every Student Learning Hub page: the brand PortalShell, a
// vertical section nav down the side, and a floating "Ask" action that stays
// reachable on mobile so getting help is always one tap away.
export default async function StudentShell({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const user = await requireUser(['student'])
  return (
    <PortalShell eyebrow="Student" sub={sub ?? 'Learning Hub'} user={user}>
      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-[208px] lg:flex-shrink-0 lg:sticky lg:top-[84px] lg:self-start">
          <StudentNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {/* Mobile sticky Ask action: the primary task is never more than one tap away. */}
      <Link
        href="/student/ask"
        className="lg:hidden fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white font-semibold text-sm"
        style={{ background: 'linear-gradient(135deg,#009dff,#007acc)', boxShadow: '0 14px 30px -8px rgba(0,157,255,.6)', fontFamily: 'var(--font-display)' }}
        aria-label="Ask a question"
      >
        <MessageCircleQuestion size={18} /> Ask
      </Link>
    </PortalShell>
  )
}
