'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight, UserRound } from 'lucide-react'

const NAV_LINKS = [
  { href: '/#subjects',       label: 'Subjects' },
  { href: '/#timetable',      label: 'Timetable' },
  { href: '/curriculum',      label: 'Curriculum' },
  { href: '/supporting-hshs', label: 'Supporting HSHS' },
  { href: '/#faq',            label: 'FAQ' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    document.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
      <div className="row">
        <Link href="/" className="brand" aria-label="Everest Tutoring home">
          <img src="/17d85578.png" alt="Everest Tutoring" />
          <span className="partner">
            <img src="/hshs-icon.jpg" alt="" className="partner-logo" width={26} height={26} />
            Harrisdale SHS
          </span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="cta-row">
          <Link href="/login" className="btn btn-secondary nav-portal-btn">
            <UserRound size={15} /> Sign in
          </Link>
          <Link href="/book" className="btn btn-primary nav-book-btn">
            Book now <ArrowRight size={16} />
          </Link>
          <button
            className="icon-btn nav-mobile-toggle"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        id="mobile-menu"
        className={`nav-mobile-menu${open ? ' open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Navigation menu"
      >
        <nav aria-label="Mobile navigation">
          {NAV_LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="nav-mobile-link"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nav-mobile-cta">
          <Link
            href="/book"
            className="btn btn-primary"
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            Book now <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            <UserRound size={15} /> Sign in
          </Link>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="nav-backdrop"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  )
}
