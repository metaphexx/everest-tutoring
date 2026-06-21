'use client'

import { useEffect, useRef } from 'react'
import {
  Users, Clock3, GraduationCap, ArrowRight,
  MapPin, Check,
} from 'lucide-react'

const PROOF = [
  { icon: GraduationCap, text: 'Years 8, 9 and 10' },
  { icon: Clock3,        text: '3:15pm to 4:15pm on campus' },
  { icon: Users,         text: 'Classes capped at 12 students' },
]

// Moving trust ticker items (includes the points that used to sit on the video card)
const TICKER = [
  'Engaging and reliable tutors',
  'HSHS alumni tutors',
  'High-quality learning materials',
  'Practice tests and exams',
  '10 weekly classes',
  'Live classes on campus at Harrisdale SHS',
  'HSHS curriculum-aligned',
  'Classes capped at 12 students',
  'Maths, English and Science',
  'On-campus after school',
  'Term 3 enrolments open',
  'Trusted by Harrisdale families',
]

export default function Hero() {
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)

  // JS-driven marquee so it always scrolls (independent of reduced-motion).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    let offset = 0
    let last = performance.now()
    const speed = 48 // px per second, right to left

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!pausedRef.current) {
        const half = track.scrollWidth / 2
        offset -= speed * dt
        if (half > 0 && -offset >= half) offset += half
        track.style.transform = `translate3d(${offset}px, 0, 0)`
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section className="hero" aria-label="Hero">
      <div className="hero-inner container">
        {/* LEFT: copy */}
        <div className="hero-copy">
          <div className="hero-chip">
            <img src="/mountain-blue.png" alt="" width={18} height={18} />
            <span>Everest Tutoring</span>
            <span className="hero-chip-x" aria-hidden="true">×</span>
            <img src="/hshs-icon.jpg" alt="" width={18} height={18} className="hero-chip-hshs" />
            <span>Harrisdale SHS</span>
          </div>

          <h1 className="hero-title">
            After-school tutoring built for{' '}
            <span className="hero-title-accent">Harrisdale students.</span>
          </h1>

          <p className="hero-lede">
            Small-group classes in Maths, English and Science, taught on campus at
            HSHS by tutors who follow the school&apos;s own course outlines. Term 3
            enrolments are now open.
          </p>

          <ul className="hero-proof" aria-label="Key facts">
            {PROOF.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="hero-proof-ic" aria-hidden="true"><Icon size={15} /></span>
                {text}
              </li>
            ))}
          </ul>

          <div className="hero-ctas">
            <a href="/book" className="btn btn-primary btn-lg">
              Enrol for Term 3 <ArrowRight size={18} />
            </a>
            <a href="#timetable" className="btn btn-secondary btn-lg">
              View timetable
            </a>
          </div>

          <div className="hero-rating" aria-label="Google rating: 4.9 stars from over 200 reviews">
            <span className="hero-stars" aria-hidden="true">★★★★★</span>
            <span><strong>4.9</strong> from 200+ Google reviews</span>
            <span className="hero-rating-div" aria-hidden="true" />
            <span>Official HSHS partner</span>
          </div>
        </div>

        {/* RIGHT: vertical B-roll video card */}
        <div className="hero-media">
          <div className="hero-media-frame">
            {/* Hero montage: autoplays muted and loops. Poster shows instantly
                and as a fallback while the video loads. */}
            <video
              className="hero-video"
              poster="/hero-1.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              <source src="/frontpagemontagechopped.mp4" type="video/mp4" />
            </video>

            <div className="hero-video-grad" aria-hidden="true" />

            {/* top badges */}
            <div className="hero-badge hero-badge-tl">
              <MapPin size={13} /> On-campus at HSHS
            </div>
            <div className="hero-badge hero-badge-tr">
              <span className="hero-live-dot" aria-hidden="true" /> Term 3 now open
            </div>
          </div>
        </div>
      </div>

      {/* moving trust ticker */}
      <div
        className="trust-ticker"
        aria-label="Why Harrisdale families choose Everest"
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        <div className="tt-track" ref={trackRef}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span className="tt-item" key={i} aria-hidden={i >= TICKER.length}>
              <span className="tt-check" aria-hidden="true"><Check size={12} /></span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
