import Link from 'next/link'
import Image from 'next/image'
import { MailCheck } from 'lucide-react'
import '../login/styles.css'

export default function CheckEmailPage() {
  return (
    <div className="login-page splash-bg">
      <div className="login-card">
        <Image src="/17d85578.png" alt="Everest Tutoring" width={192} height={60} className="login-logo" priority />
        <div
          aria-hidden="true"
          style={{
            width: 56, height: 56, borderRadius: 16, margin: '8px auto 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,157,255,.1)', color: '#009dff',
          }}
        >
          <MailCheck size={26} />
        </div>
        <h1 className="login-title">Check your email</h1>
        <p className="login-subtitle">
          We&apos;ve sent you a secure sign-in link. Click it to access your account - it&apos;s valid for 24 hours.
        </p>
        <Link href="/login" className="enrol-link">
          Back to sign in
        </Link>
        <p className="login-hint">
          Didn&apos;t get it? Check spam, or try again in a minute.
        </p>
      </div>
    </div>
  )
}
