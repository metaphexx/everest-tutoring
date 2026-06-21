'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

const STEPS = [
  { n: 1, title: 'School lesson' },
  { n: 2, title: 'Everest reinforcement' },
  { n: 3, title: 'Practice questions' },
  { n: 4, title: 'Assessment ready' },
]

// Vertical "student journey" timeline. Mirrors the homepage "How it works"
// behaviour: once it scrolls into view, a connector line fills downward and the
// numbered circles light up in sequence.
export default function JourneyFlow() {
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            const duration = 2000
            const start = performance.now()
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1)
              setProgress(1 - Math.pow(1 - p, 2)) // ease-out
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const lastIdx = STEPS.length - 1
  return (
    <div className="journey-flow" ref={ref}>
      {STEPS.map((s, i) => {
        const active = progress >= i / lastIdx - 0.0001
        // Each connector sits in the gap BELOW a label and fills as progress
        // moves from this step to the next - so the line never crosses the text.
        const connFill = Math.max(0, Math.min(1, (progress - i / lastIdx) * lastIdx)) * 100
        return (
          <Fragment key={s.n}>
            <div className={`journey-step${active ? ' active' : ''}`}>
              <div className="step-num">{s.n}</div>
              <h4>{s.title}</h4>
            </div>
            {i < lastIdx && (
              <div className="journey-connector" aria-hidden="true">
                <div className="journey-connector-fill" style={{ height: `${connFill}%` }} />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
