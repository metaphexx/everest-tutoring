'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  { n: 1, title: 'Choose year level',   body: "Pick your child's year. We'll only show classes that match." },
  { n: 2, title: 'Pick subjects',       body: 'One subject or all three. Bundle pricing applies automatically.' },
  { n: 3, title: 'Complete enrolment',  body: 'Add student details and pay securely. Spots are confirmed instantly.' },
  { n: 4, title: 'Attend weekly',       body: "Show up on campus straight after school. We'll handle reminders." },
]

export default function HowItWorks() {
  const stepsRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [progress, setProgress] = useState(0)

  // Auto-play the progress bar once the section scrolls into view.
  useEffect(() => {
    const el = stepsRef.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const duration = 2200
            const start = performance.now()
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1)
              // ease-out
              setProgress(1 - Math.pow(1 - p, 2))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.45 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="sec tight" id="how" style={{ background: 'transparent' }}>
      <div className="container">
        <div className="sec-header center">
          <div className="sec-eyebrow">How it works</div>
          <h2 className="sec-title center">From sign-up to first class in under five minutes.</h2>
        </div>
        <div className="steps" ref={stepsRef}>
          <div className="steps-fill" style={{ width: `calc((75% + 12px) * ${progress})` }} />
          {STEPS.map((s, i) => {
            const active = progress >= i / 3 - 0.0001
            return (
              <div key={s.n} className={`step${active ? ' active' : ''}`}>
                <div className="n">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
