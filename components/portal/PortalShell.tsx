import Link from 'next/link'
import { signOutAction } from '@/app/account/actions'

type Props = {
  eyebrow: string
  sub?: string
  user: { name?: string | null; role: string }
  children: React.ReactNode
}

function initialsOf(name?: string | null) {
  if (!name) return 'E'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Shared chrome for every logged-in surface: brand splash background, a glassy
// sticky header with the Everest logo in the corner, the signed-in user, and
// sign-out. Content is rendered inside .portal-main.
export default function PortalShell({ eyebrow, sub, user, children }: Props) {
  return (
    <div className="portal splash-bg">
      <header className="portal-header">
        <div className="portal-header-row">
          <Link href="/account" className="portal-brand" aria-label="Everest Tutoring home">
            <img src="/17d85578.png" alt="Everest Tutoring" />
            <span className="portal-divider" aria-hidden="true" />
            <span>
              <span className="portal-eyebrow" style={{ display: 'block' }}>{eyebrow}</span>
              {sub && <span className="portal-sub">{sub}</span>}
            </span>
          </Link>

          <div className="portal-user">
            <div className="portal-user-meta">
              <div className="portal-user-name">{user.name ?? 'Account'}</div>
              <div className="portal-user-role">{user.role}</div>
            </div>
            <div className="portal-avatar" aria-hidden="true">{initialsOf(user.name)}</div>
            <form action={signOutAction}>
              <button type="submit" className="portal-signout">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="portal-main">{children}</main>
    </div>
  )
}
