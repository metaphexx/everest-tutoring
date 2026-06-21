import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, FileText, ClipboardCheck, GraduationCap, Presentation, User } from 'lucide-react'
import PartnerBanner from '@/components/landing/PartnerBanner'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ScrollReveal from '@/components/landing/ScrollReveal'
import MobileCta from '@/components/landing/MobileCta'
import JourneyFlow from '@/components/curriculum/JourneyFlow'
import './styles.css'

// A scrollable first-page preview of a PDF (renders reliably everywhere) plus a
// link to open the full document. Files live in /public; spaces are URL-encoded.
function DocImage({ img, pdf, title, tag }: { img: string; pdf: string; title: string; tag: string }) {
  return (
    <>
      <div className="doc-frame doc-frame--img" tabIndex={0} role="group" aria-label={`Preview of ${title}`}>
        <img src={img} alt={title} />
      </div>
      <div className="doc-frame-foot">
        <span className="doc-frame-tag">{tag}</span>
        <a className="doc-frame-link" href={encodeURI(pdf)} target="_blank" rel="noopener noreferrer">
          Open full PDF <ArrowRight size={13} />
        </a>
      </div>
    </>
  )
}

export const metadata = {
  title: 'Curriculum Alignment | Everest Tutoring',
  description:
    'Every Everest lesson is built around the Harrisdale Senior High School course outlines. When your child sits a topic test, they have already practised it with us.',
}

export default function CurriculumPage() {
  return (
    <>
      {/* Trust banner + nav pin together as one unit while scrolling. */}
      <div className="topbar-stack">
        <PartnerBanner />
        <Navbar />
      </div>

      <main className="splash-bg">
      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="curr-hero">
        <div className="curr-container curr-hero-grid">
          <div className="curr-hero-copy">
            <span className="eyebrow">Curriculum Alignment</span>
            <h1>We teach exactly what <span className="curr-accent">Harrisdale SHS teaches.</span></h1>
            <p className="subhead">
              Every Everest lesson is built around the Harrisdale Senior High School course outlines.
              When your child sits a topic test, they have already practised it with us.
            </p>
            <Link href="/book" className="hero-cta">
              Enrol for Term 3 <ArrowRight size={18} />
            </Link>

            {/* Flow diagram */}
            <div className="hero-flow">
              <div className="hero-flow-node">HSHS Curriculum</div>
              <div className="hero-flow-arrow"><ArrowRight size={20} /></div>
              <div className="hero-flow-node">Everest Lesson</div>
              <div className="hero-flow-arrow"><ArrowRight size={20} /></div>
              <div className="hero-flow-node">Assessment Ready</div>
            </div>
          </div>

          {/* HSHS course outline screenshot */}
          <div className="curr-hero-media">
            <div className="curr-outline-card">
              <div className="curr-outline-head">
                <img src="/hshs-icon.jpg" alt="" width={22} height={22} />
                <span>Harrisdale SHS course outline</span>
              </div>
              <div className="curr-outline-img">
                <img src="/outline-ss.png" alt="Harrisdale SHS course outline" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Document flow: outline → booklet → prac test ─── */}
      <section className="curr-section doc-flow-section">
        <div className="curr-container">
          <p className="curr-section-eyebrow">See the quality for yourself</p>
          <h2>From school outline to exam-ready practice</h2>
          <p className="lead">
            Scroll through a Harrisdale course outline, the Everest booklet we build from it, and the
            practice test your child sits. Same content, start to finish.
          </p>

          <div className="doc-flow">
            <div className="doc-flow-item">
              <div className="doc-frame-head">
                <span className="doc-frame-ic" style={{ background: 'var(--ink-100)', color: 'var(--ink-700)' }}><BookOpen size={15} /></span>
                HSHS course outline
              </div>
              <DocImage img="/outline-preview.png" pdf="/2026_Y10_EXT_Course_Outline.pdf" title="Harrisdale SHS course outline" tag="From the school" />
            </div>

            <div className="doc-flow-arrow" aria-hidden="true"><ArrowRight size={26} /></div>

            <div className="doc-flow-item">
              <div className="doc-frame-head">
                <span className="doc-frame-ic" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}><FileText size={15} /></span>
                Everest booklet
              </div>
              <DocImage img="/booklet-preview.png" pdf="/Algebra Foundations 5_9_ Extension Pt. 1_ Linear Inequalities.pdf" title="Everest lesson booklet" tag="Built by Everest" />
            </div>

            <div className="doc-flow-arrow" aria-hidden="true"><ArrowRight size={26} /></div>

            <div className="doc-flow-item">
              <div className="doc-frame-head">
                <span className="doc-frame-ic" style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}><ClipboardCheck size={15} /></span>
                Practice test
              </div>
              <DocImage img="/prac-preview.png" pdf="/Y10 Inequalities.docx.pdf" title="Everest practice test" tag="Exam ready" />
            </div>
          </div>

          <p className="doc-flow-note">
            Scroll each document. The outline comes straight from Harrisdale SHS; the booklet and
            practice test are what Everest builds from it.
          </p>
        </div>
      </section>

      {/* ─── How curriculum alignment works ──────────── */}
      <section className="curr-section bg-white">
        <div className="curr-container">
          <p className="curr-section-eyebrow">How it works</p>
          <h2>How curriculum alignment works</h2>

          <div className="curr-how-grid">
            <div className="curr-how-card">
              <div className="icon-wrap">
                <BookOpen size={22} />
              </div>
              <h3>We follow your school&apos;s content</h3>
              <p>
                Tutors study the same unit outlines that HSHS teachers use. What is taught this week
                at school is reinforced in Everest&apos;s next class.
              </p>
            </div>

            <div className="curr-how-card">
              <div className="icon-wrap">
                <Clock size={22} />
              </div>
              <h3>Timed around assessments</h3>
              <p>
                Classes are sequenced to ensure students have covered, practised and revised relevant
                content before each topic test and examination period.
              </p>
            </div>

            <div className="curr-how-card">
              <div className="icon-wrap">
                <FileText size={22} />
              </div>
              <h3>Practice tests included</h3>
              <p>
                Students receive printed practice questions and past-paper style tests aligned to each
                topic. Practice at home continues what is started in class.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Subject cards ────────────────────────────── */}
      <section className="curr-section bg-light">
        <div className="curr-container">
          <p className="curr-section-eyebrow">Subject alignment</p>
          <h2>Maths, English and Science</h2>
          <p className="lead">
            Each subject is taught in alignment with the current HSHS unit outlines for Years 8, 9
            and 10.
          </p>

          <div className="curr-subjects-grid">
            {/* Maths */}
            <div className="curr-subject-card">
              <div className="subject-card-header maths">
                <span className="subject-tag">Mathematics</span>
                <h3>Mathematics</h3>
                <p className="years">Years 8, 9 and 10</p>
              </div>
              <div className="subject-card-body maths">
                <ul className="content-areas">
                  <li>Number and algebra</li>
                  <li>Measurement and geometry</li>
                  <li>Statistics and probability</li>
                  <li>Problem-solving and reasoning</li>
                </ul>
                <p>
                  Lessons cover current HSHS unit content. Students receive worked examples, practice
                  sets and review sheets.
                </p>
                <div className="subject-img">
                  <img src="/material-3.png" alt="Everest Maths booklet" />
                </div>
              </div>
            </div>

            {/* English */}
            <div className="curr-subject-card">
              <div className="subject-card-header english">
                <span className="subject-tag">English</span>
                <h3>English</h3>
                <p className="years">Years 8, 9 and 10</p>
              </div>
              <div className="subject-card-body english">
                <ul className="content-areas">
                  <li>Text analysis and comprehension</li>
                  <li>Essay writing and structure</li>
                  <li>Grammar and language conventions</li>
                  <li>Oral and visual literacy</li>
                </ul>
                <p>
                  We align to current HSHS texts and writing tasks. Students practise analytical
                  writing with tutor feedback.
                </p>
                <div className="subject-img">
                  <img src="/material-2.png" alt="Everest English practice materials" />
                </div>
              </div>
            </div>

            {/* Science */}
            <div className="curr-subject-card">
              <div className="subject-card-header science">
                <span className="subject-tag">Science</span>
                <h3>Science</h3>
                <p className="years">Years 8, 9 and 10</p>
              </div>
              <div className="subject-card-body science">
                <ul className="content-areas">
                  <li>Biological sciences</li>
                  <li>Chemical sciences</li>
                  <li>Physical sciences</li>
                  <li>Earth and space sciences</li>
                </ul>
                <p>
                  Lab concepts are reinforced in class using diagrams, worked examples and exam-style
                  short answer practice.
                </p>
                <div className="subject-img">
                  <img src="/material-1.png" alt="Everest Science worksheet" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Student journey flow ─────────────────────── */}
      <section className="curr-section bg-white">
        <div className="curr-container text-center">
          <p className="curr-section-eyebrow">The student journey</p>
          <h2>How it works, step by step</h2>

          <JourneyFlow />
        </div>
      </section>

      {/* ─── Small class sizes ────────────────────────── */}
      <section className="curr-section bg-light">
        <div className="curr-container">
          <div className="class-size-content">
            <div>
              <p className="curr-section-eyebrow">Class sizes</p>
              <h2>Maximum 12 students per class</h2>
              <p className="lead">
                With only 12 students in a class, tutors can check individual understanding, correct
                mistakes in real time, and adjust the pace when students need more time on a concept.
              </p>
            </div>
            <div>
              <div className="classroom" role="img" aria-label="A classroom of 12 students in three groups of four, with the tutor between the whiteboard and the students">
                <span className="classroom-board"><Presentation size={17} /> Whiteboard</span>
                <span className="classroom-tutor"><GraduationCap size={17} /> Tutor</span>
                <div className="classroom-clusters">
                  {[0, 1, 2].map((g) => (
                    <div className="cluster" key={g}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span className="student-dot" key={i} aria-hidden="true"><User size={16} /></span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo placeholders 2x2 ──────────────────── */}
      <section className="curr-section bg-white">
        <div className="curr-container">
          <p className="curr-section-eyebrow">In our classes</p>
          <h2>See Everest in action</h2>

          <div className="img-grid-2x2">
            <div className="gallery-img"><img src="/hero-1.jpg" alt="Everest tutor teaching at the whiteboard" /></div>
            <div className="gallery-img"><img src="/hero-2.jpg" alt="An Everest tutor helping a student one-on-one" /></div>
            <div className="gallery-img"><img src="/hero-3.jpg" alt="Students working together in an Everest class" /></div>
            <div className="gallery-img"><img src="/hero-7.jpg" alt="An Everest tutor leading a class" /></div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="curr-cta-section">
        <div className="curr-container">
          <h2>Ready to enrol your child?</h2>
          <p>Classes start Term 3, 20 July 2026. Places are limited to 12 per class.</p>
          <Link href="/book" className="cta-btn">
            Book your child&apos;s place <ArrowRight size={18} />
          </Link>
          <a
            href="https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/"
            className="tc-link"
            target="_blank"
            rel="noopener noreferrer"
          >
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
