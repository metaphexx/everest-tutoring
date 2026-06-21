'use client'

import { useState, Suspense } from 'react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight } from 'lucide-react'
import { requestMagicLink, type LoginState } from './actions'
import './styles.css'

function LoginForm() {
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/account'
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestMagicLink, undefined)

  return (
    <div className="login-page splash-bg">
      <div className="login-card">
        <Image
          src="/17d85578.png"
          alt="Everest Tutoring"
          width={192}
          height={60}
          className="login-logo"
          priority
        />

        <h1 className="login-title">Sign in to Everest</h1>
        <p className="login-subtitle">
          Enter your email and we&apos;ll send you a secure sign-in link. Your access is set
          automatically from your account.
        </p>

        <form action={formAction} aria-label="Sign in by email">
          <input type="hidden" name="next" value={next} />
          <div className="login-field">
            <label className="login-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {state?.error && (
            <p className="login-error" role="alert" style={{ color: '#dc2626', fontSize: 13, margin: '4px 0 0' }}>
              {state.error}
            </p>
          )}

          <button type="submit" className="signin-btn" disabled={pending}>
            <Mail size={18} />
            {pending ? 'Sending link…' : 'Email me a sign-in link'}
          </button>
        </form>

        <div className="login-divider">Or enrol for the first time</div>

        <Link href="/book" className="enrol-link">
          Start enrolment <ArrowRight size={16} />
        </Link>

        <div className="login-footer">
          <a
            href="https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms and conditions
          </a>
          <span className="sep">•</span>
          <a href="#">Privacy policy</a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page" />}>
      <LoginForm />
    </Suspense>
  )
}
