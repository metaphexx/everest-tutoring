import Link from 'next/link'

const PILLARS = [
  {
    num: '01',
    title: 'Curriculum-aligned lesson plans',
    desc: 'Each session is built around what your child is currently studying at HSHS, not a generic workbook.',
  },
  {
    num: '02',
    title: 'Assessment preparation built in',
    desc: 'Lessons are structured around upcoming tests and assignments so your child is prepared when it counts.',
  },
  {
    num: '03',
    title: 'Maximum 12 students per class',
    desc: 'Small groups mean every student gets direct attention and individual feedback every session.',
  },
  {
    num: '04',
    title: 'On campus, straight after school',
    desc: 'Classes run Monday to Friday, 3:15 to 4:15 PM inside Harrisdale SHS. No extra travel after a long day.',
  },
]

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="11" width="32" height="22" rx="4" stroke="#C3CDD8" strokeWidth="1.5" />
      <circle cx="20" cy="22" r="7" stroke="#C3CDD8" strokeWidth="1.5" />
      <path d="M15 11l2.5-4h5l2.5 4" stroke="#C3CDD8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="17" r="2" fill="#C3CDD8" />
    </svg>
  )
}

export default function Partnership() {
  return (
    <section id="partnership" style={{ background: '#F7F9FB', padding: 'clamp(64px,10vw,112px) 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* ── Left: image placeholder ────────────────────── */}
          <div className="hidden lg:block lg:col-span-5">
            <div
              className="img-placeholder w-full"
              style={{ aspectRatio: '4/5', borderRadius: '20px' }}
            >
              <CameraIcon />
              <span>Harrisdale SHS campus</span>
            </div>
          </div>

          {/* ── Right: content ─────────────────────────────── */}
          <div className="lg:col-span-7">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: '#009DFF', letterSpacing: '0.1em' }}
            >
              Official HSHS Partner
            </p>

            <h2
              className="font-display font-bold leading-tight mb-6"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                color: '#182030',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              Teaching what is actually on your child&apos;s exam.
            </h2>

            <p className="text-base leading-relaxed mb-3" style={{ color: '#5E6B7C', maxWidth: '520px' }}>
              Everest tutoring follows the Harrisdale SHS course outline week by week. When your child&apos;s class moves to a new topic, that is exactly what their session covers.
            </p>
            <p className="text-base leading-relaxed mb-10" style={{ color: '#5E6B7C', maxWidth: '520px' }}>
              Students walk into their assessments prepared, because they have already worked through the material with an experienced tutor.
            </p>

            {/* 2 x 2 pillar grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {PILLARS.map(p => (
                <div
                  key={p.num}
                  className="rounded-xl p-5 card-lift"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DDE4EC',
                    boxShadow: '0 2px 4px rgba(11,18,30,0.04)',
                  }}
                >
                  <span
                    className="font-display font-bold text-xs block mb-3"
                    style={{ color: '#009DFF' }}
                  >
                    {p.num}
                  </span>
                  <p
                    className="font-display font-bold text-sm mb-1.5"
                    style={{ color: '#182030' }}
                  >
                    {p.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#5E6B7C' }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/book"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-all hover:scale-105 active:scale-100"
              style={{
                background: 'var(--grad-summit)',
                padding: '12px 28px',
                borderRadius: '999px',
                boxShadow: '0 6px 20px rgba(0,157,255,0.3)',
              }}
            >
              Book a spot
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}
