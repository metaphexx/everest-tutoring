'use client'

import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

export default function MobileCta() {
  // Hidden on first paint (so it doesn't cover the hero) - slides up once the
  // visitor starts scrolling down.
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 140)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`mobile-cta${show ? ' is-visible' : ''}`} role="complementary" aria-label="Enrol now" aria-hidden={!show}>
      <div className="inner">
        <div className="info">
          <b>From $26.67/week</b>
          Term 3 enrolments open
        </div>
        <a href="/book" className="btn btn-primary" tabIndex={show ? 0 : -1}>
          Enrol for Term 3 <ArrowRight size={16} />
        </a>
      </div>
    </div>
  )
}
