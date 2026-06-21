'use client'

import './styles.css'
import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js'
import WaitlistRow from './WaitlistRow'
import { isEmail, isPhone, sanitizeNameInput, sanitizePhoneInput, LIMITS } from '@/lib/validate'
import { fbTrack } from '@/lib/fbpixel'
import type { BookingFormData, PricingSummary, SubjectName, YearLevel } from '@/types'
import {
  X, HelpCircle, Check, ChevronRight, ChevronLeft,
  SquareSigma, BookOpenText, FlaskConical,
  ShoppingBag, UserPlus, CreditCard, Lock,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

// Fallbacks only - the live term (dates + weeks) is fetched from the API and
// overrides these, so future terms just need editing at /admin/terms.
const TERM_3_START = new Date(2026, 6, 20) // 20 July 2026
const TERM_3_WEEKS = 10
const TERM_3_END_LABEL = '25 September 2026'
const PRICE_PER_WEEK: Record<number, number> = { 1: 35, 2: 60, 3: 80 }

// `seats` here is only an optimistic placeholder (= full capacity) shown for the
// split-second before live availability loads from /api/classes/availability;
// the real spots-left always overrides it. Never hard-code scarcity numbers.
const CLASS_CAPACITY = 12
const SCHEDULE = [
  { day: 'Mon', year: 10, subject: 'English', seats: CLASS_CAPACITY, room: 'G14' },
  { day: 'Mon', year:  9, subject: 'Maths',   seats: CLASS_CAPACITY, room: 'G12' },
  { day: 'Tue', year:  8, subject: 'English', seats: CLASS_CAPACITY, room: 'B07' },
  { day: 'Tue', year:  9, subject: 'Science', seats: CLASS_CAPACITY, room: 'S04' },
  { day: 'Wed', year:  8, subject: 'Maths',   seats: CLASS_CAPACITY, room: 'G12' },
  { day: 'Wed', year:  9, subject: 'English', seats: CLASS_CAPACITY, room: 'G14' },
  { day: 'Thu', year: 10, subject: 'Maths',   seats: CLASS_CAPACITY, room: 'G12' },
  { day: 'Fri', year: 10, subject: 'Science', seats: CLASS_CAPACITY, room: 'S04' },
  { day: 'Fri', year:  8, subject: 'Science', seats: CLASS_CAPACITY, room: 'S04' },
]

const SUBJ_INFO: Record<string, { icon: React.ReactNode; cls: string }> = {
  Maths:   { icon: <SquareSigma />,   cls: 'maths' },
  English: { icon: <BookOpenText />,  cls: 'eng'   },
  Science: { icon: <FlaskConical />,  cls: 'sci'   },
}

const STEPS = ['Year level', 'Subjects', 'Review', 'Your details', 'Payment']

const T_AND_C_URL = 'https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/'

// ─── Pricing helpers ─────────────────────────────────────────────────────────

function weeksRemaining(start: Date = TERM_3_START, totalWeeks: number = TERM_3_WEEKS): number {
  const now = new Date()
  if (now < start) return totalWeeks
  const weeksSinceStart = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, totalWeeks - weeksSinceStart)
}

function isProRata(start: Date = TERM_3_START): boolean {
  return new Date() >= start
}

function weeklyPrice(n: number): number {
  return PRICE_PER_WEEK[Math.min(n, 3)] ?? 80
}

function termCost(nSubjects: number, weeks: number): number {
  return weeklyPrice(nSubjects) * weeks
}

function siblingDiscount(numStudents: number): number {
  if (numStudents >= 3) return 0.15
  if (numStudents >= 2) return 0.10
  return 0
}

function fmt(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

function fmtWk(n: number): string {
  if (Number.isInteger(n)) return `$${n}/wk`
  return `$${n.toFixed(2)}/wk`
}

// Bundle saving vs individual pricing
function bundleSaving(nSubjects: number, weeks: number): number {
  const individual = 35 * nSubjects * weeks
  const bundle = termCost(nSubjects, weeks)
  return individual - bundle
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student {
  id: string
  year: number | null
  subjects: string[]
}

interface StudentDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface ParentDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  medicalNotes: string
  termsAccepted: boolean
  mediaConsent: boolean
  studentDetails: Record<string, StudentDetails>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initStudent(id: string): Student {
  return { id, year: null, subjects: [] }
}

function classesForStudent(s: Student) {
  if (!s.year) return []
  return SCHEDULE.filter(c => c.year === s.year)
}

function selectedClasses(s: Student) {
  return s.subjects.map(key => {
    const [subj, day] = key.split('|')
    return SCHEDULE.find(c => c.year === s.year && c.subject === subj && c.day === day)!
  }).filter(Boolean)
}

function studentTermCost(s: Student, weeks: number): number {
  const n = s.subjects.length
  if (!n) return 0
  return termCost(n, weeks)
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div className="topbar">
      <div className="row">
        <Link href="/" className="brand">
          <img src="/17d85578.png" alt="Everest Tutoring" />
          <span className="partner">
            <span className="hshs-crest">
              <img src="/hshs-icon.jpg" alt="Harrisdale Senior High School" />
            </span>
            <b>HSHS</b> Official partner
          </span>
        </Link>
        <div className="right">
          <a href="mailto:info@everesttutoring.com.au" className="help">
            <HelpCircle size={14} /> Need help?
          </a>
          <Link href="/" className="close">
            <X size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function SummaryPanel({ students, weeks, termWeeks }: { students: Student[]; weeks: number; termWeeks: number }) {
  const filled = students.filter(s => s.subjects.length > 0)
  const subtotal = filled.reduce((acc, s) => acc + studentTermCost(s, weeks), 0)
  const discRate = siblingDiscount(filled.length)
  const discount = discRate > 0 ? subtotal * discRate : 0
  const total = subtotal - discount

  return (
    <aside className="summary">
      <h5><ShoppingBag size={16} /> Order summary</h5>
      {filled.length === 0 ? (
        <div className="empty">Your selections will appear here</div>
      ) : (
        <>
          {filled.map((s, i) => {
            const classes = selectedClasses(s)
            const n = s.subjects.length
            const perSubjectWk = weeklyPrice(n) / n
            return (
              <div key={s.id} className="sum-st">
                <div className="head">
                  <div className="av">{String.fromCharCode(65 + i)}</div>
                  <span className="n">Student {s.id}</span>
                  <span className="y">Year {s.year}</span>
                </div>
                <div className="lst">
                  {classes.map(c => (
                    <div key={`${c.subject}${c.day}`}>
                      <span>{c.day} · {c.subject}</span>
                      <b>{fmtWk(perSubjectWk)}</b>
                    </div>
                  ))}
                </div>
                <div className="row-p">
                  <span>{weeks} weeks</span>
                  <b>{fmt(studentTermCost(s, weeks))}</b>
                </div>
              </div>
            )
          })}
          <div className="totals">
            <div className="row"><span>Subtotal</span><b>{fmt(subtotal)}</b></div>
            {discount > 0 && (
              <div className="row disc">
                <span>Sibling discount ({Math.round(discRate * 100)}%)</span>
                <b className="sibling-discount-badge">-{fmt(Math.round(discount))}</b>
              </div>
            )}
            <div className="grand">
              <span className="lbl">Total due today</span>
              <div className="amt">
                {fmt(Math.round(total))}
                <small>inc. GST</small>
              </div>
            </div>
          </div>
          <div className="term-note">
            {/* Term 3 coverage note */}
            Covers <b>{weeks} {weeks === termWeeks ? '' : 'remaining '}week{weeks !== 1 ? 's' : ''}</b> of Term 3. Classes run 3:15–4:15pm on the HSHS campus.
          </div>
        </>
      )}
    </aside>
  )
}

function SummaryTray({ students, weeks }: { students: Student[]; weeks: number }) {
  const filled = students.filter(s => s.subjects.length > 0)
  const subtotal = filled.reduce((acc, s) => acc + studentTermCost(s, weeks), 0)
  const discRate = siblingDiscount(filled.length)
  const total = subtotal - (discRate > 0 ? subtotal * discRate : 0)
  const count = filled.reduce((a, s) => a + s.subjects.length, 0)
  if (!filled.length) return null
  return (
    <div className="summary-tray">
      <div className="row">
        <div className="price">
          {fmt(Math.round(total))}
          <small>Total due today</small>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-500)' }}>
          {count} class{count !== 1 ? 'es' : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepYear({ student, onChange }: { student: Student; onChange: (year: number) => void }) {
  const YEARS = [
    { year: 8,  desc: 'Building strong foundations in Maths, English and Science.' },
    { year: 9,  desc: 'Consolidating skills ahead of WACE pathway decisions.' },
    { year: 10, desc: 'Preparing for the jump to senior school subjects and ATAR pathways.' },
  ]
  return (
    <div className="step-anim">
      <div className="step-eyebrow-b">Step 1 of 5</div>
      <h1 className="step-title-h">What year is your child in?</h1>
      <p className="step-sub">We will show you the subjects and timetable slots available for that year group.</p>
      <div className="year-grid">
        {YEARS.map(({ year, desc }) => {
          const classes = SCHEDULE.filter(c => c.year === year)
          const subjects = [...new Set(classes.map(c => c.subject))]
          const selected = student.year === year
          return (
            <button
              key={year}
              className={`year-card${selected ? ' selected' : ''}`}
              onClick={() => onChange(year)}
              type="button"
            >
              <div className="yc-check">
                {selected && <Check size={12} color="#fff" />}
              </div>
              <div className="glyph">Y{year}</div>
              <h3>Year {year}</h3>
              <p>{desc}</p>
              <div className="meta">
                <span><b>{subjects.length}</b> subjects</span>
                <span><b>{classes.length}</b> classes</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepSubjects({
  student,
  onChange,
  weeks,
  fullKeys,
  seatsMap,
}: {
  student: Student
  onChange: (subjects: string[]) => void
  weeks: number
  fullKeys: Set<string>
  seatsMap: Record<string, number>
}) {
  const classes = classesForStudent(student)
  const subjects = [...new Set(classes.map(c => c.subject))]
  const n = student.subjects.length
  const isFull = (subj: string) => fullKeys.has(`${student.year}|${subj}`)
  // Real spots left from the live availability fetch; the static SCHEDULE value
  // is only a placeholder before that resolves.
  const seatsLeft = (subj: string, fallback: number) => seatsMap[`${student.year}|${subj}`] ?? fallback

  function toggle(key: string) {
    const next = student.subjects.includes(key)
      ? student.subjects.filter(s => s !== key)
      : [...student.subjects, key]
    onChange(next)
  }

  // Effective rate label for currently selected state
  function pricingLabel(currentN: number): string {
    if (currentN === 0) return '$35/wk'
    if (currentN === 1) return '$35/wk'
    if (currentN === 2) return '$30/wk each (billed at $60/wk total)'
    return '$26.67/wk each (billed at $80/wk total)'
  }

  const saving = n >= 2 ? bundleSaving(n, weeks) : 0

  return (
    <div className="step-anim">
      <div className="step-eyebrow-b">Step 2 of 5</div>
      <h1 className="step-title-h">Choose subjects for Year {student.year}</h1>
      <p className="step-sub">Select one or more subjects. Bundle pricing applies automatically.</p>

      {n > 0 && (
        <div className="pricing-summary-row">
          <span className="ps-label">Current rate:</span>
          <span className="ps-rate">{pricingLabel(n)}</span>
        </div>
      )}

      <div className="subject-list">
        {subjects.map(subj => {
          const cls = classes.find(c => c.subject === subj)!
          const key = `${subj}|${cls.day}`
          // Full class: route to the waitlist instead of a booking.
          if (isFull(subj)) {
            return <WaitlistRow key={subj} year={student.year as number} subject={subj} day={cls.day} room={cls.room} />
          }
          const selected = student.subjects.includes(key)
          const { icon, cls: subjCls } = SUBJ_INFO[subj] || { icon: null, cls: '' }
          const left = seatsLeft(subj, cls.seats)
          const few = left <= 5
          // Preview what the bundle rate would look like with/without this subject
          const previewN = selected ? n : n + 1
          const previewWeeklyTotal = weeklyPrice(Math.min(previewN, 3))
          const previewLabel = selected
            ? (n > 1 ? `${fmt(weeklyPrice(n))}/wk bundle` : `${fmt(weeklyPrice(n))}/wk`)
            : previewN === 1
              ? '$35/wk'
              : `${fmt(previewWeeklyTotal)}/wk bundle`
          return (
            <button
              key={subj}
              className={`subj-row${selected ? ' selected' : ''} ${subjCls}`}
              onClick={() => toggle(key)}
              type="button"
            >
              <div className="left">
                <div className="glyph">{icon}</div>
                <div>
                  <div className="name">{subj}</div>
                  <div className="when">
                    <span>{cls.day} 3:15–4:15pm · Room {cls.room}</span>
                    <span className={`seats${few ? ' few' : ''}`}>
                      <span className="d" />{left} {left === 1 ? 'seat' : 'seats'} left
                    </span>
                  </div>
                </div>
              </div>
              <div className="right">
                <div className="price">
                  {previewLabel}
                  {!selected && previewN >= 2 && (
                    <small>was {fmt(35 * previewN)}/wk</small>
                  )}
                </div>
                <div className="sr-check">
                  {selected && <Check size={14} color="#fff" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {n >= 2 && saving > 0 && (
        <div className="bundle-banner">
          <ShoppingBag />
          <span>
            Bundle saving active: <b>{fmt(saving)} saved</b> vs individual pricing this term.
          </span>
        </div>
      )}
    </div>
  )
}

function StepReview({
  students,
  weeks,
  onRemoveStudent,
  onAddStudent,
  onEditStudent,
}: {
  students: Student[]
  weeks: number
  onRemoveStudent: (id: string) => void
  onAddStudent: () => void
  onEditStudent: (id: string) => void
}) {
  const filled = students.filter(s => s.subjects.length > 0)
  const subtotal = filled.reduce((acc, s) => acc + studentTermCost(s, weeks), 0)
  const discRate = siblingDiscount(filled.length)
  const discount = discRate > 0 ? Math.round(subtotal * discRate) : 0
  const total = subtotal - discount

  return (
    <div className="step-anim">
      <div className="step-eyebrow-b">Step 3 of 5</div>
      <h1 className="step-title-h">Review your enrolment</h1>
      <p className="step-sub">
        Check the details below. You can add a sibling to receive a{filled.length >= 2 ? ' 15%' : ' 10%'} discount on the combined total.
      </p>
      <div className="review-list">
        {students.map((s, i) => {
          const classes = selectedClasses(s)
          const n = s.subjects.length
          const cost = studentTermCost(s, weeks)
          return (
            <div key={s.id} className="review-st">
              <div className="head">
                <div className="l">
                  <div className="av">{String.fromCharCode(65 + i)}</div>
                  <div>
                    <div className="n">Student {s.id}</div>
                    <div className="y">Year {s.year}</div>
                  </div>
                </div>
                <button className="edit" onClick={() => onEditStudent(s.id)} type="button">Edit</button>
              </div>
              <div className="classes">
                {classes.map(c => (
                  <div key={`${c.subject}${c.day}`} className="cls">
                    <div className={`d ${SUBJ_INFO[c.subject]?.cls || ''}`}>
                      {c.subject.slice(0, 3).toUpperCase()}
                    </div>
                    <span><b>{c.subject}</b> · {c.day} 3:15–4:15pm, Room {c.room}</span>
                    <span className="t">{fmtWk(weeklyPrice(n) / n)}</span>
                  </div>
                ))}
              </div>
              <div className="ftr">
                <span>
                  {n} subject{n !== 1 ? 's' : ''}, {fmtWk(weeklyPrice(n))}, {weeks} week{weeks !== 1 ? 's' : ''} = <b>{fmt(cost)} total</b>
                </span>
                {students.length > 1 && (
                  <button className="rm" onClick={() => onRemoveStudent(s.id)} type="button">Remove</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {discRate > 0 && (
        <div className="sibling-discount-row">
          <div className="sdr-label">
            Sibling discount ({Math.round(discRate * 100)}% off combined total)
          </div>
          <div className="sdr-amount">-{fmt(discount)}</div>
        </div>
      )}

      {filled.length >= 2 && (
        <div className="review-total-row">
          <span>Grand total</span>
          <b>{fmt(total)}</b>
        </div>
      )}

      {students.length < 3 && (
        <button className="add-another" onClick={onAddStudent} type="button">
          <UserPlus size={18} /> Add a sibling {students.length === 1 ? '(10% sibling discount)' : '(15% discount for 3 students)'}
        </button>
      )}
    </div>
  )
}

function StepDetails({
  students,
  details,
  onChange,
}: {
  students: Student[]
  details: ParentDetails
  onChange: (d: Partial<ParentDetails>) => void
}) {
  return (
    <div className="step-anim">
      <div className="step-eyebrow-b">Step 4 of 5</div>
      <h1 className="step-title-h">Your details</h1>
      <p className="step-sub">
        We use this to send your enrolment confirmation and communicate about classes.
      </p>

      <div className="form-section">
        <h4>Parent / guardian</h4>
        <p className="sub">Primary contact for all communications about this enrolment.</p>
        <div className="grid2">
          <div className="f">
            <label htmlFor="p-fname">First name <span className="req">*</span></label>
            <input
              id="p-fname"
              type="text"
              value={details.firstName}
              onChange={e => onChange({ firstName: sanitizeNameInput(e.target.value) })}
              placeholder="Sarah"
              autoComplete="given-name"
              maxLength={LIMITS.name}
              required
            />
          </div>
          <div className="f">
            <label htmlFor="p-lname">Last name <span className="req">*</span></label>
            <input
              id="p-lname"
              type="text"
              value={details.lastName}
              onChange={e => onChange({ lastName: sanitizeNameInput(e.target.value) })}
              placeholder="Smith"
              autoComplete="family-name"
              maxLength={LIMITS.name}
              required
            />
          </div>
          <div className="f">
            <label htmlFor="p-email">Email address <span className="req">*</span></label>
            <input
              id="p-email"
              type="email"
              inputMode="email"
              value={details.email}
              onChange={e => onChange({ email: e.target.value })}
              placeholder="sarah@example.com"
              autoComplete="email"
              maxLength={LIMITS.email}
              required
              aria-invalid={!!details.email && !isEmail(details.email)}
            />
            {!!details.email && !isEmail(details.email) && (
              <p className="field-error">Enter a valid email address (e.g. sarah@example.com).</p>
            )}
          </div>
          <div className="f">
            <label htmlFor="p-phone">Mobile number <span className="req">*</span></label>
            <input
              id="p-phone"
              type="tel"
              inputMode="tel"
              value={details.phone}
              onChange={e => onChange({ phone: sanitizePhoneInput(e.target.value) })}
              placeholder="04XX XXX XXX"
              autoComplete="tel"
              maxLength={LIMITS.phone}
              required
              aria-invalid={!!details.phone && !isPhone(details.phone)}
            />
            {!!details.phone && !isPhone(details.phone) && (
              <p className="field-error">Enter a valid Australian number (e.g. 04XX XXX XXX).</p>
            )}
          </div>
        </div>
      </div>

      {students.map((s, i) => {
        const sd = details.studentDetails[s.id] ?? { firstName: '', lastName: '', email: '', phone: '' }
        return (
          <div key={s.id} className="form-section">
            <div className="per-student-block">
              <div className="pb-head">
                <div className="av">{String.fromCharCode(65 + i)}</div>
                <span className="n">Student {s.id}</span>
                <span className="y">Year {s.year}</span>
              </div>
              <div className="grid2">
                <div className="f">
                  <label htmlFor={`st-${s.id}-fname`}>First name <span className="req">*</span></label>
                  <input
                    id={`st-${s.id}-fname`}
                    type="text"
                    placeholder="Alex"
                    value={sd.firstName}
                    onChange={e => onChange({
                      studentDetails: {
                        ...details.studentDetails,
                        [s.id]: { ...sd, firstName: sanitizeNameInput(e.target.value) },
                      },
                    })}
                    autoComplete="given-name"
                    maxLength={LIMITS.name}
                    required
                  />
                </div>
                <div className="f">
                  <label htmlFor={`st-${s.id}-lname`}>Last name <span className="req">*</span></label>
                  <input
                    id={`st-${s.id}-lname`}
                    type="text"
                    placeholder="Smith"
                    value={sd.lastName}
                    onChange={e => onChange({
                      studentDetails: {
                        ...details.studentDetails,
                        [s.id]: { ...sd, lastName: sanitizeNameInput(e.target.value) },
                      },
                    })}
                    autoComplete="family-name"
                    maxLength={LIMITS.name}
                    required
                  />
                </div>
              </div>

              {/* Student's own contact details for the Learning Hub login. */}
              <p className="student-access-help">
                We&apos;ll use this to give the student their own login for class resources, tutor
                support and announcements. It needs to be different from your parent email.
              </p>
              <div className="grid2">
                <div className="f">
                  <label htmlFor={`st-${s.id}-email`}>Student email <span className="req">*</span></label>
                  <input
                    id={`st-${s.id}-email`}
                    type="email"
                    inputMode="email"
                    placeholder="student@example.com"
                    value={sd.email}
                    onChange={e => onChange({
                      studentDetails: {
                        ...details.studentDetails,
                        [s.id]: { ...sd, email: e.target.value.slice(0, LIMITS.email) },
                      },
                    })}
                    autoComplete="off"
                    maxLength={LIMITS.email}
                    required
                    aria-invalid={!!sd.email && (!isEmail(sd.email) || sd.email.trim().toLowerCase() === details.email.trim().toLowerCase())}
                  />
                  {!!sd.email && !isEmail(sd.email) && (
                    <span className="field-err">Enter a valid email address.</span>
                  )}
                  {!!sd.email && isEmail(sd.email) && sd.email.trim().toLowerCase() === details.email.trim().toLowerCase() && (
                    <span className="field-err">Student email must be different from the parent email.</span>
                  )}
                  {!!sd.email && isEmail(sd.email) && sd.email.trim().toLowerCase() !== details.email.trim().toLowerCase() &&
                    students.some(o => o.id !== s.id && (details.studentDetails[o.id]?.email ?? '').trim().toLowerCase() === sd.email.trim().toLowerCase()) && (
                    <span className="field-err">Each student needs their own email address.</span>
                  )}
                </div>
                <div className="f">
                  <label htmlFor={`st-${s.id}-phone`}>Student mobile <span className="opt">(optional)</span></label>
                  <input
                    id={`st-${s.id}-phone`}
                    type="tel"
                    inputMode="tel"
                    placeholder="04xx xxx xxx"
                    value={sd.phone}
                    onChange={e => onChange({
                      studentDetails: {
                        ...details.studentDetails,
                        [s.id]: { ...sd, phone: sanitizePhoneInput(e.target.value) },
                      },
                    })}
                    autoComplete="off"
                    maxLength={LIMITS.phone}
                    aria-invalid={!!sd.phone && !isPhone(sd.phone)}
                  />
                  {!!sd.phone && !isPhone(sd.phone) && (
                    <span className="field-err">Enter a valid Australian mobile, or leave blank.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <div className="form-section">
        <h4>Medical or learning notes</h4>
        <p className="sub">Optional. Share anything our tutors should be aware of.</p>
        <div className="f">
          <label htmlFor="medical-notes">Notes</label>
          <textarea
            id="medical-notes"
            value={details.medicalNotes}
            onChange={e => onChange({ medicalNotes: e.target.value.slice(0, LIMITS.notes) })}
            placeholder="e.g. reading glasses, prefers front row..."
            maxLength={LIMITS.notes}
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Consents</h4>
        <p className="sub">Your enrolment automatically renews each term. You can pause or cancel anytime through the parent portal.</p>
        <div className="checkbox-row">
          <input
            type="checkbox"
            checked={details.termsAccepted}
            onChange={e => onChange({ termsAccepted: e.target.checked })}
            id="terms"
          />
          <label htmlFor="terms" className="txt">
            I have read and accept the{' '}
            <a href={T_AND_C_URL} target="_blank" rel="noopener noreferrer">
              <b>Terms and Conditions (including Refund and Cancellation Policy)</b>
            </a>
            . I understand places are confirmed on payment, and that my enrolment renews
            automatically each term with my saved card charged for the next term, unless I change
            or cancel in the parent portal first. <span className="req">*</span>
          </label>
        </div>
        <div className="checkbox-row">
          <input
            type="checkbox"
            checked={details.mediaConsent}
            onChange={e => onChange({ mediaConsent: e.target.checked })}
            id="media"
          />
          <label htmlFor="media" className="txt">
            I consent to photographs taken in class being used in Everest Tutoring marketing materials.
            This is optional and can be withdrawn at any time.
          </label>
        </div>
      </div>
    </div>
  )
}

// Load Stripe.js once. In preview/dev the publishable key is a placeholder, so
// we skip loading and the payment step shows a placeholder instead of erroring.
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
const stripeReady = STRIPE_PK.startsWith('pk_') && !STRIPE_PK.includes('...')
const stripePromise = stripeReady ? loadStripe(STRIPE_PK) : null

function StepCheckout({
  students,
  details,
  weeks,
  termStart,
  termWeeks,
  termStartLabel,
  termEndLabel,
}: {
  students: Student[]
  details: ParentDetails
  weeks: number
  termStart: Date
  termWeeks: number
  termStartLabel: string
  termEndLabel: string
}) {
  const filled = students.filter(s => s.subjects.length > 0)
  const subtotal = filled.reduce((acc, s) => acc + studentTermCost(s, weeks), 0)
  const discRate = siblingDiscount(filled.length)
  const discount = discRate > 0 ? Math.round(subtotal * discRate) : 0
  const total = subtotal - discount
  const proRata = isProRata(termStart)

  const startDateLabel = proRata
    ? `${termWeeks - weeks + 1 > 0 ? `week ${termWeeks - weeks + 1} of Term 3` : 'Term 3'}`
    : termStartLabel

  // Create the Checkout Session on mount (this also saves the cart for abandoned-
  // cart recovery) and mount Stripe's embedded payment form inline below.
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'init' | 'ready' | 'preview' | 'error'>('init')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // Meta Pixel: reaching the payment step = InitiateCheckout (for ad optimisation).
  useEffect(() => {
    fbTrack('InitiateCheckout', { value: Math.round(total), currency: 'AUD', num_items: filled.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    let embedded: StripeEmbeddedCheckout | null = null
    ;(async () => {
      try {
        const formData: BookingFormData = {
          parentFirstName: details.firstName.trim(),
          parentLastName: details.lastName.trim(),
          email: details.email.trim().toLowerCase(),
          phone: details.phone.trim(),
          students: filled.map(s => ({
            firstName: details.studentDetails[s.id]?.firstName?.trim() ?? '',
            lastName: details.studentDetails[s.id]?.lastName?.trim() ?? '',
            email: details.studentDetails[s.id]?.email?.trim() || undefined,
            phone: details.studentDetails[s.id]?.phone?.trim() || undefined,
            yearLevel: s.year as YearLevel,
            selectedSubjects: s.subjects.map(k => k.split('|')[0] as SubjectName),
          })),
        }
        const n = filled[0]?.subjects.length ?? 1
        const pricing: PricingSummary = {
          subjectsPerStudent: n,
          weeksRemaining: weeks,
          weeklyRate: weeklyPrice(Math.min(n, 3)),
          perStudentTotal: subtotal / Math.max(1, filled.length),
          studentsCount: filled.length,
          subtotal,
          siblingDiscount: discount,
          total,
          totalCents: Math.round(total) * 100,
        }
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData, pricing }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data.preview || !stripePromise) { setPhase('preview'); return }
        if (!data.clientSecret) {
          setErrMsg(data.error ?? 'We could not start the secure payment. Please refresh and try again.')
          setPhase('error')
          return
        }
        const stripe = await stripePromise
        if (!stripe || cancelled) return
        embedded = await stripe.createEmbeddedCheckoutPage({ clientSecret: data.clientSecret })
        if (cancelled) { embedded.destroy(); return }
        if (containerRef.current) embedded.mount(containerRef.current)
        setPhase('ready')
      } catch {
        if (!cancelled) {
          setErrMsg('Something went wrong loading the payment form. Please refresh and try again.')
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true; try { embedded?.destroy() } catch { /* already gone */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="step-anim">
      <div className="step-eyebrow-b">Step 5 of 5</div>
      <h1 className="step-title-h">Complete your enrolment</h1>
      <p className="step-sub">
        Your place is reserved once payment is received. All payments are processed securely.
      </p>

      {proRata && (
        <div className="pro-rata-note">
          You are enrolling {termWeeks - weeks} week{termWeeks - weeks !== 1 ? 's' : ''} into Term 3. You will be charged for the remaining {weeks} week{weeks !== 1 ? 's' : ''}.
        </div>
      )}

      <div className="checkout-summary">
        <div className="cs-title">Term 3 ({weeks} week{weeks !== 1 ? 's' : ''}, {startDateLabel} to {termEndLabel})</div>
        {filled.map((s, i) => {
          const n = s.subjects.length
          const cost = studentTermCost(s, weeks)
          return (
            <div key={s.id} className="cs-row">
              <span>Student {String.fromCharCode(65 + i)} (Year {s.year}, {n} subject{n !== 1 ? 's' : ''}, {fmtWk(weeklyPrice(n))} x {weeks} wks)</span>
              <b>{fmt(cost)}</b>
            </div>
          )
        })}
        {discount > 0 && (
          <div className="cs-row disc">
            <span>Sibling discount ({Math.round(discRate * 100)}%)</span>
            <b>-{fmt(discount)}</b>
          </div>
        )}
        <div className="cs-total">
          <span>Total due today</span>
          <b>{fmt(Math.round(total))}</b>
        </div>
        <div className="cs-note">
          By completing this enrolment you agree to our{' '}
          <a href={T_AND_C_URL} target="_blank" rel="noopener noreferrer">terms and conditions</a>.
        </div>
      </div>

      <div className="pay-method">
        <div className="pay-method-head">
          <div className="ic"><CreditCard /></div>
          <div>
            <b>Pay by card</b>
            <span>Card, Apple Pay, Google Pay, or split it with Afterpay or Zip</span>
          </div>
          <div className="stripe-badge">Powered by Stripe</div>
        </div>
        <div className="security-row">
          <Lock size={13} /> Enter your details below to pay securely. Everest never sees your card number; it&apos;s held securely by Stripe.
        </div>
      </div>

      {phase === 'error' && (
        <p style={{ color: '#dc2626', fontSize: '.9rem', margin: '16px 0', textAlign: 'center' }}>{errMsg}</p>
      )}
      {phase === 'init' && (
        <div className="pay-embed-status">Loading secure payment…</div>
      )}
      {phase === 'preview' && (
        <div className="pay-embed-status">
          Stripe&apos;s secure payment form (card, Apple Pay, Google Pay, Afterpay/Zip) loads here once live
          Stripe keys are configured. Total due today: {fmt(Math.round(total))}.
        </div>
      )}
      <div
        ref={containerRef}
        className="pay-embed"
        style={{ display: phase === 'ready' ? 'block' : 'none' }}
      />
    </div>
  )
}

// ─── Inner page (uses useSearchParams so must be inside Suspense) ─────────────

function BookPageInner() {
  const searchParams = useSearchParams()

  const paramYear = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null
  const paramSubject = searchParams.get('subject') ?? null

  const [stepIdx, setStepIdx] = useState(() => {
    // If URL params provide year and subject, skip steps 0 and 1
    if (paramYear && paramSubject) return 2
    if (paramYear) return 1
    return 0
  })
  const [students, setStudents] = useState<Student[]>(() => {
    const s = initStudent('1')
    if (paramYear) {
      s.year = paramYear
      if (paramSubject) {
        const match = SCHEDULE.find(c => c.year === paramYear && c.subject === paramSubject)
        if (match) s.subjects = [`${paramSubject}|${match.day}`]
      }
    }
    return [s]
  })
  const [activeStudentId, setActiveStudentId] = useState('1')
  const [details, setDetails] = useState<ParentDetails>({
    firstName: '', lastName: '', email: '', phone: '',
    medicalNotes: '', termsAccepted: false, mediaConsent: false,
    studentDetails: {},
  })

  // Live availability + active-term dates (so billing reflects whatever the admin
  // set for the term). Full classes are keyed `${year}|${subject}`.
  const [fullKeys, setFullKeys] = useState<Set<string>>(new Set())
  const [seatsMap, setSeatsMap] = useState<Record<string, number>>({})
  const [term, setTerm] = useState<{ startISO: string; weeks: number; weeksRemaining: number; startLabel: string; endLabel: string } | null>(null)
  useEffect(() => {
    let on = true
    fetch('/api/classes/availability')
      .then((r) => r.json())
      .then((d) => { if (!on) return; setFullKeys(new Set(d.full ?? [])); setSeatsMap(d.seats ?? {}); if (d.term) setTerm(d.term) })
      .catch(() => {})
    return () => { on = false }
  }, [])

  // Resume an abandoned cart from a recovery link (?resume=token): rebuild the
  // funnel from the saved selections and jump straight to payment.
  useEffect(() => {
    const token = searchParams.get('resume')
    if (!token) return
    let on = true
    fetch(`/api/cart/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cart: { formData?: BookingFormData } | null) => {
        const fd = cart?.formData
        if (!on || !fd || !fd.students?.length) return
        const rebuilt: Student[] = fd.students.map((st, i) => ({
          id: String(i + 1),
          year: st.yearLevel,
          subjects: st.selectedSubjects
            .map((name) => {
              const match = SCHEDULE.find((c) => c.year === st.yearLevel && c.subject === name)
              return match ? `${name}|${match.day}` : null
            })
            .filter((k): k is string => !!k),
        }))
        const studentDetails: Record<string, StudentDetails> = {}
        fd.students.forEach((st, i) => {
          studentDetails[String(i + 1)] = {
            firstName: st.firstName,
            lastName: st.lastName,
            email: st.email ?? '',
            phone: st.phone ?? '',
          }
        })
        setStudents(rebuilt)
        setActiveStudentId(rebuilt[0].id)
        setDetails((d) => ({
          ...d,
          firstName: fd.parentFirstName,
          lastName: fd.parentLastName,
          email: fd.email,
          phone: fd.phone,
          termsAccepted: true,
          studentDetails,
        }))
        setStepIdx(4)
      })
      .catch(() => {})
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const termStart = term ? new Date(term.startISO) : TERM_3_START
  const termWeeks = term?.weeks ?? TERM_3_WEEKS
  const termEndLabel = term?.endLabel ?? TERM_3_END_LABEL
  const termStartLabel = term?.startLabel ?? '20 July 2026'
  // Use the server-computed remaining weeks (same engine as billing) so the
  // funnel never diverges from what's actually charged; fall back before fetch.
  const weeks = term ? term.weeksRemaining : weeksRemaining(termStart, termWeeks)

  const activeStudent = students.find(s => s.id === activeStudentId) ?? students[0]

  const updateActiveStudent = useCallback((patch: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === activeStudentId ? { ...s, ...patch } : s))
  }, [activeStudentId])

  function allStudentDetailsValid(): boolean {
    const parentEmail = details.email.trim().toLowerCase()
    const seen = new Set<string>()
    return students.every(s => {
      const sd = details.studentDetails[s.id]
      if (!sd?.firstName?.trim() || !sd?.lastName?.trim()) return false
      // Student email is required, must differ from the parent's, and each student
      // needs their own (no two siblings sharing a login).
      const email = (sd.email ?? '').trim().toLowerCase()
      if (!isEmail(email) || email === parentEmail || seen.has(email)) return false
      seen.add(email)
      // Phone is optional, but if provided it must be valid.
      if (sd.phone?.trim() && !isPhone(sd.phone)) return false
      return true
    })
  }

  function canAdvance() {
    if (stepIdx === 0) return activeStudent.year !== null
    if (stepIdx === 1) return activeStudent.subjects.length > 0
    if (stepIdx === 2) return students.every(s => s.subjects.length > 0)
    if (stepIdx === 3) {
      return !!(
        details.firstName.trim() &&
        details.lastName.trim() &&
        isEmail(details.email) &&
        isPhone(details.phone) &&
        details.termsAccepted &&
        allStudentDetailsValid()
      )
    }
    return true
  }

  function advance() {
    setStepIdx(s => s + 1)
  }

  function addStudent() {
    const newId = String(students.length + 1)
    setStudents(prev => [...prev, initStudent(newId)])
    setActiveStudentId(newId)
    setStepIdx(0)
  }

  function removeStudent(id: string) {
    setStudents(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeStudentId === id) setActiveStudentId(next[0]?.id ?? '1')
      return next
    })
  }

  const showStudentTabs = (stepIdx === 0 || stepIdx === 1) && students.length > 1
  const isFull = stepIdx >= 2
  const progressFraction = (stepIdx + 1) / 5

  return (
    <div className="splash-bg" style={{ background: 'var(--bg-ivory)', minHeight: '100vh' }}>
      <TopBar />

      {/* Desktop progress */}
      <div className="progress book-progress">
        <div className="row">
          {STEPS.map((label, i) => {
            const cls = i < stepIdx ? 'done' : i === stepIdx ? 'current' : ''
            return (
              <div key={label} className={`step ${cls}`}>
                <div className="dot">
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span className="lbl">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile progress */}
      <div className="progress-m book-progress-m">
        <div className="top">
          <span className="step-no">Step {stepIdx + 1} of 5</span>
          <span className="step-title">{STEPS[stepIdx]}</span>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${progressFraction * 100}%` }} />
        </div>
      </div>

      <div className={`book-shell${isFull ? ' full' : ''}`}>
        <main className="flow">
          {showStudentTabs && (
            <div className="student-tabs">
              {students.map((s, i) => (
                // Pill is a role="button" div (not a <button>) so the inner
                // "remove" <button> isn't nested inside another button - nested
                // buttons are invalid HTML and cause a hydration error.
                <div
                  key={s.id}
                  className={`student-tab${s.id === activeStudentId ? ' active' : ''}${s.subjects.length > 0 ? ' done' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={s.id === activeStudentId}
                  onClick={() => setActiveStudentId(s.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveStudentId(s.id) }
                  }}
                >
                  <div className="av">{String.fromCharCode(65 + i)}</div>
                  Student {s.id}
                  {students.length > 1 && (
                    <button
                      className="x-btn"
                      onClick={e => { e.stopPropagation(); removeStudent(s.id) }}
                      type="button"
                      aria-label={`Remove student ${s.id}`}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              {students.length < 3 && (
                <button className="student-add" onClick={addStudent} type="button">
                  <UserPlus size={13} /> Add sibling
                </button>
              )}
            </div>
          )}

          {stepIdx === 0 && (
            <StepYear
              student={activeStudent}
              onChange={year => updateActiveStudent({ year, subjects: [] })}
            />
          )}
          {stepIdx === 1 && (
            <StepSubjects
              student={activeStudent}
              weeks={weeks}
              fullKeys={fullKeys}
              seatsMap={seatsMap}
              onChange={subjects => updateActiveStudent({ subjects })}
            />
          )}
          {stepIdx === 2 && (
            <StepReview
              students={students}
              weeks={weeks}
              onRemoveStudent={removeStudent}
              onAddStudent={addStudent}
              onEditStudent={(id) => { setActiveStudentId(id); setStepIdx(0) }}
            />
          )}
          {stepIdx === 3 && (
            <StepDetails
              students={students}
              details={details}
              onChange={patch => setDetails(d => ({ ...d, ...patch }))}
            />
          )}
          {stepIdx === 4 && (
            <StepCheckout
              students={students}
              details={details}
              weeks={weeks}
              termStart={termStart}
              termWeeks={termWeeks}
              termStartLabel={termStartLabel}
              termEndLabel={termEndLabel}
            />
          )}

          {stepIdx < 4 && (
            <div className="flow-foot">
              {stepIdx > 0 ? (
                <button className="btn btn-secondary" onClick={() => setStepIdx(s => s - 1)} type="button">
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <Link href="/" className="btn btn-link">
                  <ChevronLeft size={16} /> Back to home
                </Link>
              )}
              <button
                className={`btn btn-primary btn-lg${!canAdvance() ? ' disabled' : ''}`}
                onClick={advance}
                disabled={!canAdvance()}
                type="button"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {stepIdx === 4 && (
            <div className="flow-foot">
              <button className="btn btn-secondary" onClick={() => setStepIdx(s => s - 1)} type="button">
                <ChevronLeft size={16} /> Back
              </button>
            </div>
          )}
        </main>

        {!isFull && <SummaryPanel students={students} weeks={weeks} termWeeks={termWeeks} />}
      </div>

      {!isFull && <SummaryTray students={students} weeks={weeks} />}
    </div>
  )
}

// ─── Main page (Suspense wrapper required for useSearchParams) ────────────────

export default function BookPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg-ivory)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink-500)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    }>
      <BookPageInner />
    </Suspense>
  )
}
