'use client'

import { useEffect } from 'react'

// Elements that gently fade + rise into view as you scroll.
const SELECTORS = [
  '.sec-header',
  '.subjects-photo',
  '.subject-card',
  '.why-card',
  '.sched-day',
  '.comparison-card',
  '.comparison-photo',
  '.google-review-card',
  '.faq-item',
  '.cta-final',
  '.curr-how-card',
  '.curr-subject-card',
  '.feature-card',
  '.doc-flow-item',
  '.doc-flow-arrow',
].join(',')

export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS))
    if (!els.length) return

    const animateIn = (el: HTMLElement) => {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
      )
      el.style.opacity = ''
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          const el = entry.target as HTMLElement
          if (entry.isIntersecting) {
            obs.unobserve(el)
            animateIn(el)
          } else if (entry.boundingClientRect.top < 0) {
            // Scrolled past it (e.g. an anchor jump): just show it, no animation.
            obs.unobserve(el)
            el.style.opacity = ''
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )

    // Only hide + animate elements that start below the fold, to avoid a flash
    // on content that is already visible when the page loads.
    const foldLine = window.innerHeight * 0.88
    els.forEach(el => {
      if (el.getBoundingClientRect().top > foldLine) {
        el.style.opacity = '0'
        io.observe(el)
      }
    })

    return () => io.disconnect()
  }, [])

  return null
}
