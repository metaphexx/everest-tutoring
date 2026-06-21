import PartnerBanner      from '@/components/landing/PartnerBanner'
import Navbar             from '@/components/landing/Navbar'
import Hero               from '@/components/landing/Hero'
import Subjects           from '@/components/landing/Subjects'
import HowItWorks         from '@/components/landing/HowItWorks'
import SchedulePreview    from '@/components/landing/SchedulePreview'
import WhyEverest         from '@/components/landing/WhyEverest'
import ComparisonSection  from '@/components/landing/ComparisonSection'
import Reviews            from '@/components/landing/Reviews'
import CtaFinal           from '@/components/landing/CtaFinal'
import FAQ                from '@/components/landing/FAQ'
import Footer             from '@/components/landing/Footer'
import MobileCta          from '@/components/landing/MobileCta'
import ScrollReveal       from '@/components/landing/ScrollReveal'

export default function LandingPage() {
  return (
    <>
      {/* Trust banner + nav pin together as one unit while scrolling. */}
      <div className="topbar-stack">
        <PartnerBanner />
        <Navbar />
      </div>
      <main className="splash-bg">
        <Hero />
        <Subjects />
        <HowItWorks />
        <SchedulePreview />
        <WhyEverest />
        <ComparisonSection />
        <Reviews />
        <CtaFinal />
        <FAQ />
      </main>
      <Footer />
      <MobileCta />
      <ScrollReveal />
    </>
  )
}
