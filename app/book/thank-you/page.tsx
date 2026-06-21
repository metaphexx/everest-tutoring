'use client'

import Link from 'next/link'
import { Mail, BookOpen, User } from 'lucide-react'

const T_AND_C_URL = 'https://everesttutoring.com.au/terms-conditions-including-refund-cancellation-policy/'

export default function ThankYouPage() {
  return (
    <>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);   opacity: .6; }
          60%  { transform: scale(1.18); opacity: .15; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ty-page {
          min-height: 100vh;
          background: var(--bg-ivory, #FFF8F2);
          display: flex; flex-direction: column;
          align-items: center;
          padding: 40px 16px 80px;
          font-family: var(--font-body, system-ui, sans-serif);
        }

        .ty-topbar {
          width: 100%; max-width: 680px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 40px;
        }
        .ty-topbar a.home-link {
          color: var(--ink-500, #5E6B7C);
          text-decoration: none;
          font-family: var(--font-ui, system-ui, sans-serif);
          font-size: 13px;
          display: inline-flex; align-items: center; gap: 6px;
          transition: color .15s;
        }
        .ty-topbar a.home-link:hover { color: var(--navy-500, #00203F); }
        .ty-brand {
          display: flex; align-items: center; gap: 10px;
        }
        .ty-brand img { height: 26px; width: auto; }

        .ty-card {
          background: #fff;
          border-radius: 24px;
          padding: clamp(32px, 5vw, 52px) clamp(24px, 5vw, 52px);
          width: 100%; max-width: 680px;
          box-shadow: 0 32px 64px -20px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.12);
          animation: slideUp .5s cubic-bezier(.22,.61,.36,1) both;
        }

        /* Success ring */
        .ty-ring-wrap {
          display: flex; justify-content: center;
          margin-bottom: 28px;
          position: relative;
        }
        .ty-ring {
          width: 96px; height: 96px; border-radius: 50%;
          background: linear-gradient(135deg, #009dff, #00FFFF);
          display: flex; align-items: center; justify-content: center;
          position: relative;
          box-shadow: 0 12px 30px -10px rgba(0,157,255,.55);
          animation: scaleIn .5s cubic-bezier(.175,.885,.32,1.275) .1s both;
        }
        .ty-ring::before, .ty-ring::after {
          content: '';
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 2.5px solid #009dff;
          animation: ringPulse 1.6s ease-out .5s both;
        }
        .ty-ring::after {
          animation-delay: .75s;
        }
        .ty-check {
          width: 44px; height: 44px;
          color: #16A34A;
        }
        /* SVG checkmark drawn with CSS */
        .ty-check-svg {
          width: 44px; height: 44px;
        }
        .ty-check-svg path {
          stroke: #fff;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck .5s ease .45s forwards;
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }

        .ty-heading {
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 800;
          font-size: clamp(28px, 4vw, 38px);
          letter-spacing: -.025em;
          color: #0F2A4F;
          text-align: center;
          margin: 0 0 10px;
        }
        .ty-sub {
          font-size: 15.5px;
          color: #4B5563;
          text-align: center;
          line-height: 1.6;
          margin: 0 0 36px;
          max-width: 52ch;
          margin-left: auto; margin-right: auto;
        }

        /* Enrolment details card */
        .ty-details {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 22px 24px;
          margin-bottom: 32px;
        }
        .ty-details-title {
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 800;
          font-size: 13px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #64748B;
          margin-bottom: 14px;
        }
        .ty-details-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 8px 0;
          border-bottom: 1px dashed #E2E8F0;
          font-family: var(--font-ui, system-ui, sans-serif);
          font-size: 14px;
          color: #64748B;
          gap: 12px;
        }
        .ty-details-row:last-child { border: none; padding-bottom: 0; }
        .ty-details-row b {
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 700;
          color: #0F172A;
          text-align: right;
        }

        /* Next steps cards */
        .ty-next-title {
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 800;
          font-size: 18px;
          color: #0F2A4F;
          margin: 0 0 16px;
          letter-spacing: -.01em;
        }
        .ty-next-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }
        .ty-next-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 16px;
        }
        .ty-next-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: var(--brand-50, #E6F6FF);
          color: var(--brand-600, #007ECC);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .ty-next-icon svg { width: 18px; height: 18px; }
        .ty-next-card b {
          display: block;
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 700;
          font-size: 13.5px;
          color: #0F172A;
          margin-bottom: 6px;
        }
        .ty-next-card p {
          font-size: 12.5px;
          color: #64748B;
          line-height: 1.55;
          margin: 0;
        }

        /* Auto-enrolment note */
        .ty-autorenewal {
          padding: 14px 18px;
          background: #FFF7ED;
          border: 1px solid #FED7AA;
          border-radius: 12px;
          font-family: var(--font-ui, system-ui, sans-serif);
          font-size: 13px;
          color: #92400E;
          line-height: 1.55;
          margin-bottom: 28px;
        }

        /* CTA buttons */
        .ty-actions {
          display: flex; gap: 12px; flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .ty-btn-primary {
          flex: 1; min-width: 160px;
          background: linear-gradient(135deg, #009dff, #007acc);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 15px 24px;
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 10px 24px -10px rgba(0,157,255,.6);
          transition: filter .15s, transform .15s;
        }
        .ty-btn-primary:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .ty-btn-secondary {
          flex: 1; min-width: 140px;
          background: transparent;
          color: #4B5563;
          border: 1.5px solid #D1D5DB;
          border-radius: 12px;
          padding: 14px 24px;
          font-family: var(--font-display, system-ui, sans-serif);
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          transition: all .15s;
        }
        .ty-btn-secondary:hover { border-color: #9CA3AF; color: #111827; }

        /* Footer */
        .ty-footer {
          margin-top: 24px;
          text-align: center;
          font-family: var(--font-ui, system-ui, sans-serif);
          font-size: 12px;
          color: var(--ink-400, #8C99A8);
        }
        .ty-footer a { color: var(--brand-600, #007ECC); }
        .ty-footer a:hover { color: var(--navy-500, #00203F); }

        /* Responsive */
        @media (max-width: 680px) {
          .ty-next-grid { grid-template-columns: 1fr; }
          .ty-actions { flex-direction: column; }
          .ty-btn-primary, .ty-btn-secondary { min-width: 0; }
          .ty-details-row { flex-direction: column; gap: 2px; }
          .ty-details-row b { text-align: left; }
        }
      `}</style>

      <div className="ty-page splash-bg">
        <div className="ty-topbar">
          <Link href="/" className="ty-brand">
            <img src="/17d85578.png" alt="Everest Tutoring" />
          </Link>
          <Link href="/" className="home-link">
            Back to home
          </Link>
        </div>

        <div className="ty-card">
          {/* Animated success ring */}
          <div className="ty-ring-wrap">
            <div className="ty-ring">
              <svg className="ty-check-svg" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 23L18 31L34 14" />
              </svg>
            </div>
          </div>

          <h1 className="ty-heading">You&apos;re enrolled!</h1>
          <p className="ty-sub">
            Thank you for enrolling with Everest Tutoring. Your payment has been received and your child&apos;s place is confirmed for Term 3.
          </p>

          {/* Enrolment details */}
          <div className="ty-details">
            <div className="ty-details-title">Enrolment details</div>
            <div className="ty-details-row">
              <span>Term</span>
              <b>Term 3, 2026</b>
            </div>
            <div className="ty-details-row">
              <span>Campus</span>
              <b>Harrisdale Senior High School</b>
            </div>
            <div className="ty-details-row">
              <span>Classes</span>
              <b>Monday to Friday, 3:15 to 4:15pm</b>
            </div>
            <div className="ty-details-row">
              <span>Start date</span>
              <b>20 July 2026</b>
            </div>
          </div>

          {/* What happens next */}
          <div className="ty-next-title">What happens next</div>
          <div className="ty-next-grid">
            <div className="ty-next-card">
              <div className="ty-next-icon">
                <Mail />
              </div>
              <b>Confirmation email</b>
              <p>A confirmation email with class details will be sent to you within a few minutes. Check your spam folder if you do not see it.</p>
            </div>
            <div className="ty-next-card">
              <div className="ty-next-icon">
                <BookOpen />
              </div>
              <b>Before first class</b>
              <p>Your child can head straight to their classroom after school on the first day. Room details are in your confirmation email.</p>
            </div>
            <div className="ty-next-card">
              <div className="ty-next-icon">
                <User />
              </div>
              <b>Parent portal</b>
              <p>Log in to the parent portal to manage your enrolment, view class schedules, communicate with the team, and track payment status.</p>
            </div>
          </div>

          {/* Auto-renewal notice */}
          <div className="ty-autorenewal">
            Your enrolment will roll over automatically for Term 4 unless you change or cancel through the parent portal before the next term.
          </div>

          {/* Actions */}
          <div className="ty-actions">
            <Link href="/dashboard" className="ty-btn-primary">
              Go to parent portal
            </Link>
            <Link href="/" className="ty-btn-secondary">
              Back to home
            </Link>
          </div>
        </div>

        <div className="ty-footer">
          <a href={T_AND_C_URL} target="_blank" rel="noopener noreferrer">
            Terms and Conditions (including Refund and Cancellation Policy)
          </a>
          {' '}&middot;{' '}
          <a href="mailto:info@everesttutoring.com.au">info@everesttutoring.com.au</a>
        </div>
      </div>
    </>
  )
}
