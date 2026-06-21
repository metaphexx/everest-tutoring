'use client'

import { useState, useEffect } from 'react'
import { SquareSigma, BookOpenText, FlaskConical, ArrowRight } from 'lucide-react'

type YearFilter = 'all' | '8' | '9' | '10'

interface ClassEntry {
  year: string
  subject: 'Maths' | 'English' | 'Science'
  room: string
  seats: number
  maxSeats: number
}

interface DayData {
  name: string
  classes: ClassEntry[]
}

const DAYS: DayData[] = [
  {
    name: 'Monday',
    classes: [
      { year: '10', subject: 'English', room: 'G14', seats: 4,  maxSeats: 12 },
      { year: '9',  subject: 'Maths',   room: 'G12', seats: 7,  maxSeats: 12 },
    ],
  },
  {
    name: 'Tuesday',
    classes: [
      { year: '8', subject: 'English', room: 'B07', seats: 9,  maxSeats: 12 },
      { year: '9', subject: 'Science', room: 'S04', seats: 5,  maxSeats: 12 },
    ],
  },
  {
    name: 'Wednesday',
    classes: [
      { year: '8', subject: 'Maths',   room: 'G12', seats: 6,  maxSeats: 12 },
      { year: '9', subject: 'English', room: 'G14', seats: 2,  maxSeats: 12 },
    ],
  },
  {
    name: 'Thursday',
    classes: [
      { year: '10', subject: 'Maths', room: 'G12', seats: 4, maxSeats: 12 },
    ],
  },
  {
    name: 'Friday',
    classes: [
      { year: '10', subject: 'Science', room: 'S04', seats: 8,  maxSeats: 12 },
      { year: '8',  subject: 'Science', room: 'S04', seats: 10, maxSeats: 12 },
    ],
  },
]

// Prototype toggle: `true` shows the photo-forward variant (generic subject
// stock imagery behind a subject-coloured scrim); `false` keeps the solid
// gradient-panel cards.
const PHOTO_VARIANT = false

const SUBJECT_META: Record<string, { icon: React.ReactNode; colorClass: string; labelColor: string; bgTint: string; borderColor: string; photo: string }> = {
  Maths: {
    icon: <SquareSigma size={17} />,
    colorClass: 'sched-maths',
    labelColor: '#007ECC',
    bgTint: '#E6F6FF',
    borderColor: '#009DFF',
    photo: '/stock-maths.jpg',
  },
  English: {
    icon: <BookOpenText size={17} />,
    colorClass: 'sched-english',
    labelColor: '#B14B1F',
    bgTint: '#FFF1EC',
    borderColor: '#D9622F',
    photo: '/stock-english.jpg',
  },
  Science: {
    icon: <FlaskConical size={17} />,
    colorClass: 'sched-science',
    labelColor: '#15703C',
    bgTint: '#E6F8EC',
    borderColor: '#1E8A4A',
    photo: '/stock-science.jpg',
  },
}

export default function SchedulePreview() {
  const [filter, setFilter] = useState<YearFilter>('all')
  // Live spots left per class (`${year}|${subject}`), so the timetable shows real
  // availability instead of a static "12 of 12". Falls back to maxSeats until it loads.
  const [liveSeats, setLiveSeats] = useState<Record<string, number>>({})
  useEffect(() => {
    let on = true
    fetch('/api/classes/availability')
      .then((r) => r.json())
      .then((d) => { if (on) setLiveSeats(d.seats ?? {}) })
      .catch(() => {})
    return () => { on = false }
  }, [])

  return (
    <section className="sec sched-section" id="timetable">
      <div className="container">
        {/* header */}
        <div className="sched-header">
          <div>
            <div className="sec-eyebrow">Weekly timetable</div>
            <h2 className="sec-title" style={{ marginBottom: 8 }}>Term 3 schedule, on campus at HSHS.</h2>
            <p className="sec-lede">All classes run 3:15pm to 4:15pm, immediately after school. Filter by year to find your options.</p>
          </div>
          <div className="sched-filter-wrap">
            <div className="sched-tabs" role="tablist" aria-label="Filter by year">
              {(['all', '8', '9', '10'] as YearFilter[]).map(y => (
                <button
                  key={y}
                  role="tab"
                  aria-selected={filter === y}
                  className={`sched-tab${filter === y ? ' active' : ''}`}
                  onClick={() => setFilter(y)}
                >
                  {y !== 'all' && <span className={`sched-tab-dot sched-yr-${y}`} aria-hidden="true" />}
                  {y === 'all' ? 'All years' : `Year ${y}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* pricing banner */}
        <div className="sched-pricing-strip" aria-label="Pricing">
          <span className="sched-pricing-label">Pricing</span>
          <div className="sched-pricing-items">
            <span><strong>1 subject</strong> $35/wk</span>
            <span className="sched-pricing-dot" aria-hidden="true" />
            <span><strong>2 subjects</strong> $60/wk</span>
            <span className="sched-pricing-dot" aria-hidden="true" />
            <span><strong>3 subjects</strong> $80/wk</span>
          </div>
          <a href="/book" className="sched-pricing-cta">Enrol now <ArrowRight size={13} /></a>
        </div>

        {/* grid */}
        <div className="sched-grid">
          {DAYS.map(day => {
            const visible = day.classes.filter(c => filter === 'all' || c.year === filter)
            const dimmed  = day.classes.filter(c => filter !== 'all' && c.year !== filter)
            return (
              <div key={day.name} className="sched-day">
                <div className="sched-day-head">
                  <span className="sched-day-name">{day.name}</span>
                  <span className="sched-day-time">3:15 – 4:15pm</span>
                </div>

                <div className="sched-cards">
                  {visible.map(c => {
                    const meta = SUBJECT_META[c.subject]
                    const left = liveSeats[`${c.year}|${c.subject}`] ?? c.maxSeats
                    const isFull = left <= 0
                    return (
                      <a
                        key={`${c.year}-${c.subject}`}
                        href={`/book?year=${c.year}&subject=${c.subject}`}
                        className={`sched-card ${meta.colorClass}${PHOTO_VARIANT ? ' photo' : ''}`}
                        aria-label={isFull ? `Year ${c.year} ${c.subject}, class full, join the waitlist` : `Year ${c.year} ${c.subject}, ${left} of ${c.maxSeats} seats available`}
                      >
                        {PHOTO_VARIANT && (
                          <>
                            <img className="sc-bg" src={meta.photo} alt="" loading="lazy" />
                            <span className="sc-tint" aria-hidden="true" />
                          </>
                        )}
                        <div className="sched-card-top">
                          <span className="sched-card-icon" aria-hidden="true">{meta.icon}</span>
                          <strong className="sched-card-subj">{c.subject}</strong>
                        </div>
                        <div className="sched-card-mid">
                          <span className={`sched-card-year sched-yr-${c.year}`}>Year {c.year}</span>
                        </div>
                        <div className="sched-card-foot">
                          <span className="sched-card-seats">
                            <span className="sched-seats-dot" aria-hidden="true" />
                            {isFull ? 'Class full · join waitlist' : `${left} of ${c.maxSeats} seats available`}
                          </span>
                          <span className="sched-card-link">{isFull ? 'Join waitlist' : 'Book this class'} <ArrowRight size={11} /></span>
                        </div>
                      </a>
                    )
                  })}

                  {dimmed.map(c => {
                    const meta = SUBJECT_META[c.subject]
                    return (
                      <div key={`${c.year}-${c.subject}-dim`} className={`sched-card ${meta.colorClass}${PHOTO_VARIANT ? ' photo' : ''} dimmed`} aria-hidden="true">
                        {PHOTO_VARIANT && (
                          <>
                            <img className="sc-bg" src={meta.photo} alt="" loading="lazy" />
                            <span className="sc-tint" aria-hidden="true" />
                          </>
                        )}
                        <div className="sched-card-top">
                          <span className="sched-card-icon">{meta.icon}</span>
                          <strong className="sched-card-subj">{c.subject}</strong>
                        </div>
                        <div className="sched-card-mid">
                          <span className={`sched-card-year sched-yr-${c.year}`}>Year {c.year}</span>
                        </div>
                      </div>
                    )
                  })}

                  {visible.length === 0 && dimmed.length === 0 && (
                    <div className="sched-empty">No classes on this day</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* footer */}
        <div className="sched-foot">
          <div className="sched-legend">
            <span className="sched-legend-item">
              <span className="sched-legend-swatch" style={{ background: '#009DFF' }} />
              <span>Mathematics</span>
            </span>
            <span className="sched-legend-item">
              <span className="sched-legend-swatch" style={{ background: '#D9622F' }} />
              <span>English</span>
            </span>
            <span className="sched-legend-item">
              <span className="sched-legend-swatch" style={{ background: '#1E8A4A' }} />
              <span>Science</span>
            </span>
          </div>
          <a href="/book" className="btn btn-primary">Enrol for Term 3 <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  )
}
