import Link from 'next/link'
import { ArrowRight, Presentation, Compass, School, Stethoscope, GraduationCap, NotebookPen } from 'lucide-react'
import PartnerBanner from '@/components/landing/PartnerBanner'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ScrollReveal from '@/components/landing/ScrollReveal'
import MobileCta from '@/components/landing/MobileCta'
import './styles.css'

export const metadata = {
  title: 'Supporting Harrisdale SHS | Everest Tutoring',
  description:
    'Everest Tutoring has been an active presence in the Harrisdale SHS community since we began. Beyond weekly classes, our team runs talks, supports events, and gives back.',
}

const T_AND_C_URL =
  'https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/'

const PILLARS = [
  {
    icon: Presentation,
    title: 'Guest talks',
    body: 'Free presentations for Years 10 to 12 on Medicine, ATAR pathways and study skills, run on campus.',
  },
  {
    icon: Compass,
    title: 'Careers Day',
    body: 'We host a stall at the HSHS Careers Day, talking with students about university and career pathways.',
  },
  {
    icon: School,
    title: 'On-campus classes',
    body: 'Our weekly classes run at Harrisdale SHS itself, the same campus, straight after school.',
  },
]

const TALKS = [
  {
    icon: Stethoscope,
    title: 'Medicine and ATAR Pathways Talk',
    body: 'Years 10 to 12 hear directly from high-achieving past students on pursuing Medicine and a competitive ATAR.',
    img: '/med%20talk.jpg',
    alt: 'Everest Tutoring running its Medicine and ATAR pathways talk at Harrisdale SHS',
  },
  {
    icon: GraduationCap,
    title: 'Pathways into University',
    body: 'A general session on the many routes into university: ATAR, portfolio entry, alternative admission and early-offer programs, so every student can see a path that fits them.',
    img: '/atar.jpg',
    alt: 'Everest Tutoring presenting on pathways into university to Harrisdale SHS students',
  },
  {
    icon: NotebookPen,
    title: 'Study Skills Workshop',
    body: 'Practical revision techniques, time management for assessments, and how to approach different question types.',
    img: '/study%20skills.jpg',
    alt: 'Everest Tutoring running a study skills workshop for Harrisdale SHS students',
  },
]

export default function SupportingHshsPage() {
  return (
    <>
      {/* Trust banner + nav pin together as one unit while scrolling. */}
      <div className="topbar-stack">
        <PartnerBanner />
        <Navbar />
      </div>

      <main className="splash-bg">
        {/* ─── Hero ─────────────────────────────────────── */}
        <section className="hshs-hero">
          <div className="hshs-container hshs-hero-grid">
            <div className="hshs-hero-copy">
              <span className="hshs-eyebrow">Supporting Harrisdale SHS</span>
              <h1>
                More than tutoring.<br />
                A real part of the<br />
                <span className="hshs-accent">HSHS community.</span>
              </h1>
              <p className="subhead">
                Everest Tutoring has been an active presence in the Harrisdale SHS community since we
                began. Beyond weekly classes, our team runs talks, supports events, and gives back to
                students at the school.
              </p>

              <div className="hshs-hero-actions">
                <div
                  className="hshs-lockup"
                  aria-label="Everest Tutoring in partnership with Harrisdale Senior High School"
                >
                  <img src="/logo.png" alt="Everest Tutoring" className="lockup-everest" />
                  <span className="lockup-x" aria-hidden="true">×</span>
                  <img
                    src="/hshs-logo-long.jpg"
                    alt="Harrisdale Senior High School"
                    className="lockup-hshs"
                  />
                </div>
                <Link href="/book" className="cta-btn">
                  Enrol for Term 3 <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="hshs-hero-media">
              <figure className="hero-photo">
                <div className="hero-photo-frame">
                  <img src="/executive.jpg" alt="The Everest Tutoring and Harrisdale SHS leadership team" />
                </div>
                <figcaption>
                  Pictured here (left to right): Mrs. Everal Eaton (Principal), Mr Owen Davies
                  (Associate Principal), Hari Ravichandran (CEO)
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ─── Community pillars ────────────────────────── */}
        <section className="hshs-section bg-white">
          <div className="hshs-container">
            <p className="section-eyebrow">Beyond the classroom</p>
            <h2>How we show up for HSHS students</h2>
            <p className="section-lead">
              Tutoring is only part of what we do. We are involved in school life across the year.
              Here is where you will find us.
            </p>

            <div className="pillars-grid">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div className="pillar-card" key={title}>
                  <div className="pillar-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Talks and presentations ──────────────────── */}
        <section className="hshs-section bg-light">
          <div className="hshs-container">
            <p className="section-eyebrow">Community involvement</p>
            <h2>Talks and presentations</h2>
            <p className="section-lead">
              Our tutors and senior staff regularly visit Harrisdale SHS to run presentations on
              topics that matter to students and families. These talks are free and open to HSHS
              students.
            </p>

            <div className="talks-grid">
              {TALKS.map(({ icon: Icon, title, body, img, alt }) => (
                <div className="why-card" key={title}>
                  <img className="wc-photo" src={img} alt={alt} loading="lazy" />
                  <div className="wc-scrim" />
                  <div className="wc-body">
                    <div className="ic">
                      <Icon />
                    </div>
                    <h4>{title}</h4>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Careers Day ──────────────────────────────── */}
        <section className="hshs-section bg-white">
          <div className="hshs-container">
            <p className="section-eyebrow">Events</p>
            <h2>HSHS Careers Day</h2>
            <p className="section-lead">
              Everest Tutoring participates in the Harrisdale SHS Careers Day, where our team speaks
              with students about education pathways, university options, and what it takes to
              pursue careers in medicine, law, engineering and other competitive fields.
            </p>

            <div className="careers-grid">
              <div className="careers-video">
                <video autoPlay muted loop playsInline controls preload="auto">
                  <source src="/hshs%20montage%20shorteneed.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="section-photo">
                <img src="/stall.jpg" alt="The Everest Tutoring stall at the Harrisdale SHS Careers Day" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Excellence Award ─────────────────────────── */}
        <section className="hshs-section bg-light">
          <div className="hshs-container">
            <div className="award-section-inner">
              <div>
                <p className="section-eyebrow">Annual recognition</p>
                <h2>Everest Tutoring Excellence Award</h2>
                <p className="award-copy">
                  Last year, Everest Tutoring was invited to present the Excellence Award to a
                  graduating Year 12 student from Harrisdale SHS who had demonstrated outstanding
                  commitment to their studies and personal growth. The award was presented
                  personally to the graduate by our team.
                </p>
                <blockquote className="award-quote">
                  <p>
                    &ldquo;This award recognises not just academic results, but the effort,
                    resilience and character that students bring to their learning every day.&rdquo;
                  </p>
                </blockquote>
              </div>
              <div>
                <div className="section-photo">
                  <img
                    src="/award.jpeg"
                    alt="Everest Tutoring presenting the Excellence Award to a Harrisdale SHS Year 12 graduate"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tutor team ───────────────────────────────── */}
        <section className="hshs-section bg-white">
          <div className="hshs-container">
            <div className="team-section-inner">
              <div className="team-copy">
                <p className="section-eyebrow">Our team</p>
                <h2>Meet the team</h2>
                <p className="award-copy">
                  Our tutors are experienced educators who are passionate about student outcomes.
                  Several of our tutors have direct experience with the HSHS curriculum and student
                  cohort, and many are high-achieving graduates themselves.
                </p>
                <p className="team-contact">
                  Want to know more? Get in touch at{' '}
                  <a href="mailto:info@everesttutoring.com.au">info@everesttutoring.com.au</a>
                </p>
              </div>
              <div className="team-media">
                <div className="section-photo">
                  <img src="/meettheteam.jpg" alt="The Everest Tutoring team" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────── */}
        <section className="hshs-cta-section">
          <div className="hshs-container">
            <h2>Enrol your child for Term 3</h2>
            <p className="hshs-cta-sub">
              Classes start Term 3, 20 July 2026, on campus at Harrisdale SHS. Places are limited to
              12 per class.
            </p>
            <Link href="/book" className="cta-btn">
              Enrol now <ArrowRight size={18} />
            </Link>
            <a href={T_AND_C_URL} className="tc-link" target="_blank" rel="noopener noreferrer">
              Terms and conditions including refund and cancellation policy
            </a>
          </div>
        </section>
      </main>

      <Footer />
      <MobileCta />
      <ScrollReveal />
    </>
  )
}
