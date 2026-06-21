'use client'

import { useState, useEffect } from 'react'
import { Users, ArrowRight } from 'lucide-react'

// The classes shown in the "Seats remaining" teaser. Counts are pulled live from
// /api/classes/availability so they always reflect actual bookings (the full
// timetable below shows every class). Keyed `${year}|${subject}`.
const CLASSES: { year: number; subject: string; label: string }[] = [
  { year: 8, subject: 'Science', label: 'Year 8 Science' },
  { year: 8, subject: 'English', label: 'Year 8 English' },
  { year: 9, subject: 'Maths', label: 'Year 9 Maths' },
  { year: 10, subject: 'Science', label: 'Year 10 Science' },
  { year: 10, subject: 'Maths', label: 'Year 10 Maths' },
  { year: 9, subject: 'English', label: 'Year 9 English' },
]

const CAPACITY = 12

export default function CtaFinal() {
  const [seats, setSeats] = useState<Record<string, number>>({})
  useEffect(() => {
    let on = true
    fetch('/api/classes/availability')
      .then((r) => r.json())
      .then((d) => { if (on) setSeats(d.seats ?? {}) })
      .catch(() => {})
    return () => { on = false }
  }, [])

  return (
    <section className="sec" id="book" style={{ paddingTop: 0 }}>
      <div style={{ padding: '0 var(--container-px)' }}>
        <div className="cta-final">
          <div className="inner">
            <div>
              <div className="sec-eyebrow" style={{ color: 'var(--cyan-500)' }}>Term 3 enrolments</div>
              <h2>Book your child&apos;s place before Term 3 fills.</h2>
              <p>
                Every class is capped at 12 students, so places are limited. Enrol now and lock in your child&apos;s spot for Term 3.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <a href="/book" className="btn btn-on-dark btn-lg">
                  Start enrolment <ArrowRight size={18} />
                </a>
                <a href="#timetable" className="btn btn-ghost-on-dark btn-lg">Browse the timetable</a>
              </div>
            </div>

            <div className="seats-card">
              <div className="h">
                <span>Seats remaining</span>
                <Users size={16} style={{ color: 'var(--cyan-500)' }} />
              </div>
              {CLASSES.map((c) => {
                const left = seats[`${c.year}|${c.subject}`] ?? CAPACITY
                const full = left <= 0
                const few = left <= 3
                return (
                  <div key={c.label} className={`row-r ${full || few ? 'few' : 'ok'}`}>
                    <span className="left"><span className="dot" />{c.label}</span>
                    <b>{full ? 'Full' : left}</b>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
