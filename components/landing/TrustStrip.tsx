import { Award, ShieldCheck, BookOpen, Users } from 'lucide-react'

const ITEMS = [
  { icon: Award,       title: '200+ five-star reviews', sub: 'From Perth families' },
  { icon: ShieldCheck, title: 'Official HSHS partner',  sub: 'Endorsed by the school' },
  { icon: BookOpen,    title: 'Curriculum aligned',     sub: 'Built around HSHS course outlines' },
  { icon: Users,       title: 'Small classes, max 12',  sub: 'Term 3 enrolments open' },
]

export default function TrustStrip() {
  return (
    <section className="trust-strip" id="trust">
      <div className="container">
        <div className="row">
          {ITEMS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="item">
              <div className="ic"><Icon /></div>
              <div className="txt"><b>{title}</b><span>{sub}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
