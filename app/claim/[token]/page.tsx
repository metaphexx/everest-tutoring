import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getClaimOffer } from '@/lib/waitlist'
import ClaimConfirm from './ClaimConfirm'

export const metadata = { title: 'Claim your seat | Everest Tutoring' }
export const dynamic = 'force-dynamic'

const DAY_NAMES = ['', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays']

const card: CSSProperties = {
  maxWidth: 440, width: '100%', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(18px) saturate(150%)',
  WebkitBackdropFilter: 'blur(18px) saturate(150%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 24,
  padding: '36px 30px', boxShadow: '0 30px 80px -40px rgba(15,42,79,.5)',
}
const wrap: CSSProperties = { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="splash-bg" style={wrap}>
      <div style={card}>
        <Image src="/17d85578.png" alt="Everest Tutoring" width={144} height={45} style={{ margin: '0 auto 22px', display: 'block' }} priority />
        {children}
      </div>
    </main>
  )
}

function Message({ title, body, tone = 'neutral' }: { title: string; body: string; tone?: 'neutral' | 'warn' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: tone === 'warn' ? '#b45309' : '#00203F' }}>{title}</h1>
      <p style={{ color: '#475569', fontSize: '.92rem', marginTop: 8, lineHeight: 1.6 }}>{body}</p>
      <Link href="/login" style={{ display: 'inline-block', marginTop: 18, fontSize: '.85rem', fontWeight: 600, color: '#009dff' }}>Go to your dashboard →</Link>
    </div>
  )
}

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const offer = await getClaimOffer(token)

  if (!offer) {
    return <Shell><Message title="Link not found" body="This claim link isn't valid. It may have already been used. Log in to your dashboard to check your waitlist." /></Shell>
  }
  if (offer.status === 'enrolled') {
    return <Shell><Message title="You're enrolled ✓" body="Payment received and the seat is secured - see you in class! Your schedule is in your dashboard." /></Shell>
  }
  if ((offer.status !== 'offered' && offer.status !== 'claimed') || offer.expired) {
    return <Shell><Message tone="warn" title="This offer has expired" body="The 48-hour window to secure this seat has passed and it may have been offered to the next family. Log in to re-join the waitlist if you'd still like the spot." /></Shell>
  }

  const s = offer.subject
  const priceLabel = `$${(offer.priceCents / 100).toFixed(0)}`
  const pending = offer.status === 'claimed'
  return (
    <Shell>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#009dff' }}>{pending ? 'Almost yours - just pay to lock it in' : 'A seat opened up 🎉'}</p>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00203F', marginTop: 6 }}>
          {s.name} <span style={{ color: '#fff', background: s.color, padding: '2px 10px', borderRadius: 999, fontSize: '.85rem', verticalAlign: 'middle' }}>Year {s.yearLevel}</span>
        </h1>
        {offer.studentName && <p style={{ color: '#475569', fontSize: '.95rem', marginTop: 8 }}>for {offer.studentName}</p>}
        <div style={{ background: 'rgba(0,157,255,.07)', borderRadius: 14, padding: '12px 14px', margin: '18px 0', fontSize: '.9rem', color: '#334155' }}>
          {DAY_NAMES[s.dayOfWeek]} · {s.startTime}–{s.endTime} · at Harrisdale SHS
        </div>
        <p style={{ color: '#475569', fontSize: '.88rem', marginBottom: 4 }}>
          Pay {priceLabel} to secure the seat for the rest of term ({offer.weeks} weeks). It&apos;s first to pay, first served.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '.78rem', marginBottom: 16 }}>The seat is only confirmed once payment goes through.</p>
      </div>
      <ClaimConfirm token={token} priceLabel={priceLabel} />
      <p style={{ color: '#94a3b8', fontSize: '.75rem', textAlign: 'center', marginTop: 14 }}>This link is just for you and expires 48 hours after it was sent.</p>
    </Shell>
  )
}
