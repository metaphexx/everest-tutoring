'use client'

import { useRef } from 'react'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

// Live Google reviews page (opens the reviews tab on the Everest Tutoring listing).
const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/place/Everest+Tutoring/@-32.108137,115.935882,17z/data=!4m8!3m7!1s0x2a329771068fbbe5:0x716576d1f42e8748!8m2!3d-32.108137!4d115.9384569!9m1!1b1'

// Real Google reviews from the Everest Tutoring listing.
type Review = { name: string; initials: string; color: string; rating: number; when: string; text: string }

const REVIEWS: Review[] = [
  {
    name: 'Leslie Dcruz', initials: 'L', color: '#1E6B52', rating: 5, when: 'a year ago',
    text: 'I have already been recommending Everest tutoring in my circle of contact. Hari is very approachable and helpful. All of their tutors are brilliant. My son in year 11 appreciates the work Everest tutoring does and never likes to miss any sessions. They give quality assessment materials and work books. They are flexible and really care for the students.',
  },
  {
    name: 'afsheen khan', initials: 'A', color: '#2A6CB0', rating: 5, when: '11 months ago',
    text: "I've have a 2 children currently being tutored by Everest Tutoring. One in Year 10 and one prepping for GATE. They have both benefited greatly from the tutoring. Everest's approach is young and fresh and resonates well with both children. They are keen to go every week and are not hesitant to ask questions when needed. The volume of work is reasonable and allows them to do quality work over quantity. The bonus is the online question bank for GATE which is a game changer for anyone prepping for GATE. I would highly recommend Everest Tutoring to anyone looking for effective tutoring for their children.",
  },
  {
    name: 'Shilpa Tyagi', initials: 'S', color: '#7C4DA0', rating: 5, when: 'a year ago',
    text: "Experienced and knowledgeable tutors, both of my sons got benefits from the tuition. One of them had placed a place in medicine in UWA. It's an engaging and encouraging environment that makes you discover strategies of excellence. Hari is approachable and leads the team in a great manner. High five 🙌",
  },
  {
    name: 'Syam Pillai', initials: 'S', color: '#5E6B7C', rating: 5, when: '11 months ago',
    text: "I'm so happy with progress of my boy under Everest Tutoring. He is doing really well with his maths and Science. After getting tutorials from Everest Tutoring his skills has build up. I fully recommend Everest Tutoring to everyone.",
  },
  {
    name: 'Dharanidharan Vijayan', initials: 'D', color: '#B0573B', rating: 5, when: 'a year ago',
    text: "The worksheets are really helpful. Sometimes I learn content that even my class at school hasn't started yet. The tutors answer any doubt about the content and give you advice for tests, exams and studying. I'm glad I joined.",
  },
  {
    name: 'Bala Balachandar', initials: 'B', color: '#2E7D8A', rating: 5, when: 'a year ago',
    text: 'Classes are well organized and tutors are coordinated, friendly and professional. They provide booklets that improve performance and are available even after classes for help.',
  },
]

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function Reviews() {
  const trackRef = useRef<HTMLDivElement>(null)

  function scrollByCard(dir: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.google-review-card')
    const amount = card ? card.offsetWidth + 18 : track.clientWidth * 0.8
    track.scrollBy({ left: dir * amount, behavior: 'smooth' })
  }

  return (
    <section className="sec" id="reviews" style={{ background: 'transparent' }}>
      <div className="container">
        <div className="reviews-head">
          <div>
            <div className="sec-eyebrow">What Harrisdale families say</div>
            <h2 className="sec-title" style={{ marginBottom: 8 }}>Real feedback from real students &amp; parents.</h2>
            <p className="sec-lede" style={{ marginTop: 0 }}>
              Straight from our Google reviews.
            </p>
          </div>
          <div className="reviews-head-right">
            <div className="reviews-stars">
              <GoogleG />
              <span className="stars">★★★★★</span>
              <span>4.9 · Google Reviews</span>
            </div>
            <div className="review-arrows">
              <button className="review-arrow" aria-label="Previous reviews" onClick={() => scrollByCard(-1)}>
                <ChevronLeft size={18} />
              </button>
              <button className="review-arrow" aria-label="Next reviews" onClick={() => scrollByCard(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="review-carousel" ref={trackRef}>
          {REVIEWS.map((r, i) => (
            <div key={i} className="google-review-card">
              <div className="grc-header">
                <div className="grc-avatar" aria-hidden="true" style={{ background: r.color }}>{r.initials}</div>
                <div className="grc-meta">
                  <div className="grc-name">{r.name}</div>
                  <div className="grc-source">
                    <GoogleG />
                    <span>Google Review</span>
                  </div>
                </div>
              </div>
              <div className="grc-stars-row">
                <span className="grc-stars" aria-label={`${r.rating} stars`}>{'★'.repeat(r.rating)}</span>
                <span className="grc-when">{r.when}</span>
              </div>
              <p className="grc-text">{r.text}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-flex', gap: 8 }}
          >
            Read all our Google reviews <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </section>
  )
}
