import { signOut } from '@/auth'
import { ShieldAlert } from 'lucide-react'
import '../login/styles.css'

export const metadata = { title: 'Account suspended' }
export const dynamic = 'force-dynamic'

// Standalone notice for a locked account. Deliberately does NOT call requireUser
// (it would loop), so a suspended user lands here instead of any portal.
export default function SuspendedPage() {
  return (
    <div className="login-page splash-bg">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(220,38,38,.1)', color: '#dc2626',
          }}
        >
          <ShieldAlert size={26} />
        </div>
        <h1 className="login-title">Account suspended</h1>
        <p className="login-subtitle">
          Your account has been locked pending review by the Everest team. If you believe this is a mistake,
          contact us at info@everesttutoring.com.au.
        </p>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <button type="submit" className="enrol-link" style={{ width: '100%' }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
