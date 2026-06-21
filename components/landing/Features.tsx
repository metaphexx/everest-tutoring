const BENEFITS = [
  {
    num: '01',
    title: 'Curriculum-aligned, every lesson',
    desc: 'Lesson plans follow the HSHS course outline. What is taught in school is reinforced and extended in each session.',
  },
  {
    num: '02',
    title: 'Official HSHS partner',
    desc: 'Backed by the school and held on campus. The only afterschool program built with Harrisdale SHS, not just near it.',
  },
  {
    num: '03',
    title: 'Experienced tutors, quality materials',
    desc: 'Thoroughly prepared lessons, high-quality materials, and tutors who know their subject well.',
  },
  {
    num: '04',
    title: 'Small groups, focused attention',
    desc: 'Maximum 12 students per class. Every student is seen, supported, and challenged at the right level.',
  },
]

export default function Features() {
  return (
    <section style={{ background: '#F7F9FB', padding: 'clamp(64px,10vw,112px) 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-16 items-start">

          {/* ── Left: benefits ──────────────────────────────── */}
          <div className="lg:col-span-3">
            <h2
              className="font-display font-bold leading-tight mb-14"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                color: '#182030',
                letterSpacing: '-0.025em',
              }}
            >
              Why Harrisdale families choose Everest.
            </h2>

            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
              {BENEFITS.map(b => (
                <div key={b.num}>
                  <span
                    className="font-display font-bold text-xs block mb-3 uppercase tracking-widest"
                    style={{ color: '#009DFF', letterSpacing: '0.08em' }}
                  >
                    {b.num}
                  </span>
                  <h3
                    className="font-display font-bold text-base mb-2"
                    style={{ color: '#182030' }}
                  >
                    {b.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#5E6B7C' }}
                  >
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: social proof cards ────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* 200+ stars card */}
            <div
              className="rounded-2xl p-8 text-center card-lift"
              style={{
                background: '#FFFFFF',
                border: '1px solid #DDE4EC',
                boxShadow: '0 4px 16px rgba(11,18,30,0.06)',
              }}
            >
              <div className="flex justify-center gap-1 mb-4">
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="22" height="22" viewBox="0 0 20 20" fill="#F59E0B" aria-hidden="true">
                    <path d="M10 1l2.2 4.47L17 6.18l-3.5 3.41.83 4.82L10 12.08l-4.33 2.33.83-4.82L3 6.18l4.8-.71L10 1z" />
                  </svg>
                ))}
              </div>
              <p
                className="font-display font-bold mb-1.5"
                style={{ fontSize: '3.5rem', color: '#182030', lineHeight: 1, letterSpacing: '-0.04em' }}
              >
                200+
              </p>
              <p className="text-sm" style={{ color: '#5E6B7C' }}>
                five-star reviews from Perth families
              </p>
            </div>

            {/* Partnership callout */}
            <div
              className="rounded-2xl p-7"
              style={{ background: '#00203F' }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'rgba(0,255,255,0.7)', letterSpacing: '0.1em' }}
              >
                Partnership
              </p>
              <p
                className="font-display font-bold text-xl text-white leading-snug mb-3"
              >
                Official afterschool partner of Harrisdale Senior High School
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                The only tutoring program backed and hosted by HSHS. Built with the school, not just near it.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
