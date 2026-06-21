'use client'

// Animated copy of app/login/page.tsx. The original files are left untouched.
// Visit /login-animated to preview. Reuses the same server action and tokens.

import { useState, Suspense } from 'react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight } from 'lucide-react'
import { requestMagicLink, type LoginState } from '../login/actions'
import './styles.css'

const PARTICLES = Array.from({ length: 10 })

function LoginForm() {
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/account'
  // ?motion=on forces animations on even when the OS/browser requests reduced motion (preview only).
  const forceMotion = searchParams.get('motion') === 'on'
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestMagicLink, undefined)

  return (
    <div className={`lva-page splash-bg${forceMotion ? ' lva-motion' : ''}`}>
      <div className="lva-topo" aria-hidden="true" />

      <svg className="lva-peaks lva-peaks-back" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,320 L0,210 L240,120 L420,200 L640,90 L860,190 L1080,110 L1280,200 L1440,140 L1440,320 Z" />
      </svg>
      <svg className="lva-peaks lva-peaks-front" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,320 L0,250 L200,180 L380,250 L560,160 L760,250 L980,170 L1200,250 L1440,200 L1440,320 Z" />
      </svg>

      <div className="lva-particles" aria-hidden="true">
        {PARTICLES.map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 9 + 6) % 100}%`,
              animationDelay: `${(i * 0.7).toFixed(1)}s`,
              animationDuration: `${7 + (i % 4) * 1.5}s`,
            }}
          />
        ))}
      </div>

      <div className="lva-card">
        <svg className="lva-ridge" viewBox="0 0 380 60" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,52 60,30 100,40 150,12 200,36 250,8 300,30 340,20 380,44" />
        </svg>

        <div className="lva-enter" style={{ ['--d' as string]: '.15s' } as React.CSSProperties}>
          <Image
            src="/17d85578.png"
            alt="Everest Tutoring"
            width={192}
            height={60}
            className="lva-logo"
            priority
          />
        </div>

        <h1 className="lva-title lva-enter" style={{ ['--d' as string]: '.28s' } as React.CSSProperties}>
          Sign in to Everest
        </h1>
        <p className="lva-subtitle lva-enter" style={{ ['--d' as string]: '.4s' } as React.CSSProperties}>
          Enter your email and we&apos;ll send you a secure sign-in link. Your access is set
          automatically from your account.
        </p>

        <form action={formAction} aria-label="Sign in by email">
          <input type="hidden" name="next" value={next} />
          <div className="lva-field lva-enter" style={{ ['--d' as string]: '.52s' } as React.CSSProperties}>
            <label className="lva-label" htmlFor="email">
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
              className="lva-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {state?.error && (
            <p className="lva-error" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            className="lva-btn lva-enter"
            style={{ ['--d' as string]: '.64s' } as React.CSSProperties}
            disabled={pending}
          >
            <Mail size={18} className="lva-btn-icon" />
            <span>{pending ? 'Sending link…' : 'Email me a sign-in link'}</span>
            <ArrowRight size={18} className="lva-btn-arrow" />
          </button>
        </form>

        <div className="lva-divider lva-enter" style={{ ['--d' as string]: '.76s' } as React.CSSProperties}>
          Or enrol for the first time
        </div>

        <div className="lva-enter" style={{ ['--d' as string]: '.86s' } as React.CSSProperties}>
          <Link href="/book" className="lva-enrol">
            Start enrolment <ArrowRight size={16} />
          </Link>
        </div>

        <div className="lva-footer lva-enter" style={{ ['--d' as string]: '.96s' } as React.CSSProperties}>
          <a
            href="https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms and conditions
          </a>
          <span className="lva-sep">•</span>
          <a href="#">Privacy policy</a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="lva-page" />}>
      <LoginForm />
    </Suspense>
  )
}
