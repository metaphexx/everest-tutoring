import { ShieldCheck, CalendarCheck } from 'lucide-react'

export default function PartnerBanner() {
  return (
    <div className="partner-banner">
      <div className="row">
        <span className="pb-official">
          <ShieldCheck />
          <span>
            Official partner of{' '}
            {/* Full name on desktop, "HSHS" on mobile so it stays one slim line. */}
            <b className="pb-name-full">Harrisdale Senior High School</b>
            <b className="pb-name-short">HSHS</b>
          </span>
          <span className="dot" />
        </span>
        <CalendarCheck />
        <span>Term 3 enrolments open</span>
      </div>
    </div>
  )
}
