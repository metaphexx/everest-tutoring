import { Check, ArrowRight } from 'lucide-react'

const EVEREST = [
  'Walk from class to tutor in minutes',
  'Curriculum matched to HSHS course outlines',
  'Lessons timed to upcoming assessments',
  'Classes capped at 12 students',
  'Taught on the same campus your child attends every day',
]

export default function ComparisonSection() {
  return (
    <section className="sec comparison-section">
      <div className="container">
        <div className="sec-header center">
          <div className="sec-eyebrow">Why on-campus tutoring?</div>
          <h2 className="sec-title center">The difference is where it happens.</h2>
          <p className="sec-lede center">
            Everest runs on the same campus your child already attends, so support is part of the
            school day, not another drive across Perth.
          </p>
        </div>

        <div className="comparison-grid">
          {/* Everest side */}
          <div className="comparison-card comparison-everest">
            <div className="comparison-card-head">
              <img src="/mountain-blue.png" alt="" width={20} height={20} aria-hidden="true" />
              <span className="comparison-tag comparison-tag-everest">Everest at Harrisdale SHS</span>
            </div>
            <ul className="comparison-list">
              {EVEREST.map(item => (
                <li key={item} className="comparison-item comparison-item-good">
                  <span className="comparison-icon comparison-icon-good" aria-hidden="true">
                    <Check size={14} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image space */}
          <div className="comparison-photo">
            <img
              src="/campus.jpg"
              alt="Harrisdale Senior High School campus where Everest classes are held"
              loading="lazy"
            />
            <span className="comparison-photo-badge">On the HSHS campus</span>
          </div>
        </div>

        <div className="comparison-cta">
          <a href="/book" className="btn btn-primary btn-lg">
            Enrol for Term 3 <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
