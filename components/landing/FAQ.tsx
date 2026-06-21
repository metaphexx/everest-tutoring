'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  q: string
  a: string | React.ReactNode
}

const FAQS: FAQItem[] = [
  {
    q: 'When does Term 3 start?',
    a: 'Term 3 classes begin in Week 1, from 20 July to 26 July 2026. Classes run every week until the end of term.',
  },
  {
    q: 'Where are classes held?',
    a: 'All Everest classes are held on the Harrisdale Senior High School campus, in the rooms listed in the timetable. Students go directly to class after school.',
  },
  {
    q: 'What should my child bring?',
    a: 'Students should bring their school bag, a notebook, pens and any relevant school textbooks or notes. We provide printed practice materials and worksheets in class.',
  },
  {
    q: 'Do Everest classes follow the HSHS curriculum?',
    a: 'Yes. Our tutors work from the same curriculum documents and course outlines used at Harrisdale SHS. Lessons are timed around upcoming assessments and topic tests.',
  },
  {
    q: 'How many students are in each class?',
    a: 'Classes are capped at 12 students. Small class sizes mean tutors can give each student individual attention.',
  },
  {
    q: 'How much does it cost?',
    a: 'One subject: $35 per week. Two subjects: $60 per week. Three subjects: $80 per week. Pricing is per student per week for the duration of the term.',
  },
  {
    q: 'Is there a sibling discount?',
    a: 'Yes. Enrol one sibling and everyone in your family receives 10% off. Enrol two or more siblings and the discount increases to 15% off.',
  },
  {
    q: 'What if we enrol mid-term?',
    a: 'If you enrol after Term 3 has started, you will be charged a pro rata fee based on the number of weeks remaining, not the full term fee.',
  },
  {
    q: 'Does enrolment continue next term?',
    a: 'Yes, enrolment rolls over automatically each term so your child keeps their place. You can change or stop enrolment at any time through the parent portal.',
  },
  {
    q: 'How do I cancel or change enrolment?',
    a: (
      <>
        Log in to the parent portal to update your enrolment, change subjects, or stop auto-renewal before the next term begins. See our{' '}
        <a
          href="https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="faq-link"
        >
          terms and conditions
        </a>{' '}
        for the full policy.
      </>
    ),
  },
  {
    q: 'How is payment processed?',
    a: 'Payment is processed securely via Stripe. We accept all major credit and debit cards. You will receive a receipt by email after completing enrolment.',
  },
  {
    q: 'What if my child misses a class?',
    a: 'We offer a catch-up session or account credit for up to two missed classes, applied to a following term. We do not offer refunds. Just request it through the parent portal and we will sort it out.',
  },
  {
    q: 'What is the parent portal?',
    a: 'The parent portal lets you manage your enrolment, view class schedules, track payment status, communicate with the team, and update your details.',
  },
  {
    q: 'Where can I read the terms and conditions?',
    a: (
      <>
        Full terms and conditions, including the cancellation and refund policy, are available at{' '}
        <a
          href="https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="faq-link"
        >
          everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/
        </a>
      </>
    ),
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i))
  }

  return (
    <section className="sec faq-section" id="faq">
      <div className="container">
        <div className="sec-header">
          <div className="sec-eyebrow">Have questions?</div>
          <h2 className="sec-title">Frequently asked questions.</h2>
        </div>

        <div className="faq-list" role="list">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className={`faq-item${isOpen ? ' open' : ''}`}
                role="listitem"
              >
                <button
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span className="faq-question">{item.q}</span>
                  <span className="faq-chevron" aria-hidden="true">
                    <ChevronDown size={18} />
                  </span>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  className="faq-answer-wrap"
                  hidden={!isOpen}
                >
                  <div className="faq-answer">
                    {typeof item.a === 'string' ? <p>{item.a}</p> : <p>{item.a}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
