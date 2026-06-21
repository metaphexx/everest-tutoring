import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, GraduationCap, CalendarClock } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { getStudentForUser, getStudentClasses, nextClass, whenLabel, formatTime, dayLong, subjectColor } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'

export const metadata: Metadata = { title: 'My classrooms | Everest Tutoring' }

export default async function ClassesPage() {
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) return <StudentShell sub="Classes"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>

  const classes = await getStudentClasses(student.id)

  return (
    <StudentShell sub="Classes">
      <div className="mb-5">
        <h1 className="portal-title">My classrooms</h1>
        <p className="portal-lede">Each classroom has a stream where you and your tutor post, plus resources and your school work.</p>
      </div>

      {classes.length === 0 ? (
        <div className="glass-card glass-card-pad text-center">
          <p className="text-sm text-slate-500">You are not enrolled in any classes yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {classes.map((c) => {
            const next = nextClass([c])
            const color = subjectColor(c.name)
            return (
              <Link key={c.id} href={`/student/classes/${c.id}`} className="glass-card glass-card-pad block transition-transform hover:-translate-y-0.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full mb-2" style={{ background: color }} />
                <h2 className="text-base font-bold text-dark" style={{ fontFamily: 'var(--font-display)' }}>{c.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Year {c.yearLevel}</p>
                {c.tutorName && <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2"><GraduationCap size={13} /> {c.tutorName}</p>}
                {next && <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><CalendarClock size={13} /> {whenLabel(next.date)} · {dayLong(c.dayOfWeek)} {formatTime(c.startTime)}</p>}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3">Open classroom <ArrowRight size={13} /></span>
              </Link>
            )
          })}
        </div>
      )}
    </StudentShell>
  )
}
