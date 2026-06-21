import Link from 'next/link'
import { SquareSigma, BookOpenText, FlaskConical, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Subject = {
  cls: string
  Icon: LucideIcon
  name: string
  blurb: string
  photo: string
  alt: string
}

const SUBJECTS: Subject[] = [
  {
    cls: 'maths',
    Icon: SquareSigma,
    name: 'Mathematics',
    blurb: 'Algebra, geometry and statistics - practised on the exact topics your child is sitting in class.',
    photo: '/subject-maths.jpg',
    alt: 'An Everest tutor explaining algebra at the whiteboard during a Maths class at Harrisdale SHS',
  },
  {
    cls: 'eng',
    Icon: BookOpenText,
    name: 'English',
    blurb: 'Comprehension, analysis and written response, aligned to the HSHS texts and writing tasks this term.',
    photo: '/subject-english.jpg',
    alt: 'An Everest tutor helping a student with written work during an English class',
  },
  {
    cls: 'sci',
    Icon: FlaskConical,
    name: 'Science',
    blurb: 'Biology, chemistry and physics, taught with worked examples and the practice tests we provide.',
    photo: '/subject-science.jpg',
    alt: 'An Everest tutor teaching a biology topic at the whiteboard during a Science class',
  },
]

const YEARS = ['Year 8', 'Year 9', 'Year 10']

export default function Subjects() {
  return (
    <section className="sec" id="subjects">
      <div className="container">
        <div className="subjects-intro">
          <div className="sec-header" style={{ marginBottom: 0 }}>
            <div className="sec-eyebrow">Subjects &amp; year levels</div>
            <h2 className="sec-title">Three subjects. Three year levels. Built around what they&apos;re learning.</h2>
            <p className="sec-lede">
              Every class is taught by an experienced subject specialist and mapped week-by-week to the Harrisdale SHS course outline, so lesson topics line up with what&apos;s coming next in class.
            </p>
          </div>
          <div className="subjects-photo">
            <img src="/hero-1.jpg" alt="An Everest tutor working with students during an after-school class at Harrisdale SHS" />
            <span className="subjects-photo-badge">On campus at HSHS</span>
          </div>
        </div>
        <div className="subjects-grid">
          {SUBJECTS.map(({ cls, Icon, name, blurb, photo, alt }) => (
            <Link key={name} href="/curriculum" className={`subject-card ${cls}`}>
              <img className="sc-photo" src={photo} alt={alt} loading="lazy" />
              <div className="sc-scrim" />
              <span className="sc-go" aria-hidden="true"><ArrowUpRight size={17} /></span>
              <div className="sc-body">
                <span className="sc-ic"><Icon size={19} /></span>
                <h3>{name}</h3>
                <p>{blurb}</p>
                <div className="years">
                  {YEARS.map(y => <span key={y} className="year-pill">{y}</span>)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
