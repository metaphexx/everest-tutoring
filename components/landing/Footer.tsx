import Link from 'next/link'

const PROGRAMS = [
  { href: '/#subjects',       label: 'Year 8' },
  { href: '/#subjects',       label: 'Year 9' },
  { href: '/#subjects',       label: 'Year 10' },
  { href: '/#timetable',      label: 'Timetable' },
  { href: '/curriculum',      label: 'Curriculum alignment' },
  { href: '/supporting-hshs', label: 'Supporting HSHS' },
]

const COMPANY = [
  { href: '#',         label: 'About Everest' },
  { href: '#',         label: 'Our tutors' },
  { href: '/#reviews', label: 'Reviews' },
  { href: '#',         label: 'Contact' },
]

const PARENTS = [
  { href: '/book',       label: 'Enrol for Term 3' },
  { href: '/dashboard',  label: 'Parent portal' },
  { href: 'https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/', label: 'Terms and conditions' },
  { href: '#',           label: 'Privacy' },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="f-grid">
          <div className="brand-col">
            <img
              src="/2e24a1d6.png"
              alt="Everest Tutoring"
            />
            <p>
              Everest Tutoring delivers curriculum-aligned after-school classes on the Harrisdale Senior High School campus. Years 8 to 10. Maths, English and Science.
            </p>
            <div className="partner-chip">
              <span className="crest">
                <img src="/hshs-icon.jpg" alt="Harrisdale Senior High School" />
              </span>
              Official partner of Harrisdale SHS
            </div>
          </div>

          <div>
            <h6>Programs</h6>
            <ul>
              {PROGRAMS.map(l => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>

          <div>
            <h6>Company</h6>
            <ul>
              {COMPANY.map(l => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>

          <div>
            <h6>Parents</h6>
            <ul>
              {PARENTS.map(l => (
                <li key={l.label}>
                  {l.href.startsWith('http') ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                  ) : (
                    <Link href={l.href}>{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="legal">
          <span>&copy; 2026 Everest Tutoring. ABN 39 601 405 047.</span>
          <span>Harrisdale Senior High School &amp; Everest Tutoring partnership program.</span>
        </div>
      </div>
    </footer>
  )
}
