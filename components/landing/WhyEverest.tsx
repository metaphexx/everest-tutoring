import { BookOpen, CalendarCheck2, Target, GraduationCap, FileText, HeartHandshake, MapPin, MessagesSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CARDS: { Icon: LucideIcon; title: string; body: string; img: string; pos?: string }[] = [
  { Icon: BookOpen,       title: 'Curriculum-aligned lessons',  body: "Every week's content matches what students are sitting in class at HSHS.", img: '/hero-3.jpg', pos: 'center 36%' },
  { Icon: CalendarCheck2, title: 'Structured weekly classes',   body: 'Consistent same-day, same-time scheduling builds the practice habit.', img: '/hero-8.jpg', pos: 'center 14%' },
  { Icon: Target,         title: 'Assessment preparation',      body: 'Practice on the exact question types HSHS uses for topic tests and exams.', img: '/hero-9.jpg', pos: 'center 18%' },
  { Icon: GraduationCap,  title: 'Experienced subject tutors',  body: 'Strong subject specialists, many of whom teach confidently across more than one subject.', img: '/hero-5.jpg', pos: 'center 12%' },
  { Icon: FileText,       title: 'High-quality materials',      body: 'Custom workbooks and worked solutions students keep for revision.', img: '/material-1.png', pos: 'center top' },
  { Icon: HeartHandshake, title: 'Supportive classroom',        body: "Small-group setting where students aren't afraid to ask the question.", img: '/hero-10.jpg', pos: 'center 26%' },
  { Icon: MapPin,         title: 'On the HSHS campus',          body: 'No drop-offs, no extra travel. Straight from the last bell into class.', img: '/campus.jpg', pos: 'center 40%' },
  { Icon: MessagesSquare, title: 'Parents stay informed',       body: 'An end-of-term report showing what was covered and how your child is tracking.', img: '/hero-7.jpg', pos: 'center 30%' },
]

export default function WhyEverest() {
  return (
    <section className="sec why-bg" id="why">
      <div className="container">
        <div className="sec-header center">
          <div className="sec-eyebrow">Why families choose Everest</div>
          <h2 className="sec-title center">Built specifically for Harrisdale students.</h2>
        </div>
        <div className="why-grid">
          {CARDS.map(({ Icon, title, body, img, pos }) => (
            <div key={title} className="why-card">
              <img className="wc-photo" src={img} alt="" loading="lazy" style={pos ? { objectPosition: pos } : undefined} />
              <div className="wc-scrim" />
              <div className="wc-body">
                <div className="ic"><Icon /></div>
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
