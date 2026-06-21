import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format, startOfDay, addDays } from 'date-fns'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { weeklyTeachingPlan } from '@/lib/teaching'
import PrintButton from './PrintButton'

export const metadata = { title: 'Run-sheet' }
export const dynamic = 'force-dynamic'

const DAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function RunSheetPage() {
  const user = await requireUser(['tutor'])
  const today = new Date()

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, tutorId: user.id },
    include: { enrollments: { where: { status: 'active' }, include: { student: true } }, tutor: { select: { name: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { yearLevel: 'asc' }],
  })

  const cards = await Promise.all(
    subjects.map(async (s) => ({
      s,
      plan: await weeklyTeachingPlan({ yearLevel: s.yearLevel, subject: s.name }, today),
    })),
  )

  return (
    <div className="runsheet-root">
      <style>{`
        .runsheet-root { background: #fff; color: #0f2a4f; min-height: 100vh; padding: 24px; font-family: var(--font-ui, system-ui), sans-serif; }
        .rs-wrap { max-width: 880px; margin: 0 auto; }
        .rs-cls { border: 1px solid #d9e2ec; border-radius: 12px; padding: 18px; margin-bottom: 16px; page-break-inside: avoid; }
        .rs-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .rs-table th, .rs-table td { border: 1px solid #d9e2ec; padding: 7px 10px; text-align: left; font-size: 13px; }
        .rs-table th { background: #f3f7fb; font-weight: 700; }
        .rs-box { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #94a3b8; border-radius: 4px; }
        @media print {
          .rs-noprint { display: none !important; }
          .runsheet-root { padding: 0; }
        }
      `}</style>

      <div className="rs-wrap">
        <div className="rs-noprint" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Link href="/tutor" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#007ecc', fontSize: 14, textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <PrintButton />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Weekly run-sheet</h1>
        <p style={{ fontSize: 13, color: '#5e6b7c', marginBottom: 20 }}>{user.name} · week of {format(addDays(startOfDay(today), 1 - (today.getDay() === 0 ? 7 : today.getDay())), 'd MMM yyyy')}</p>

        {cards.length === 0 && <p style={{ color: '#5e6b7c' }}>No classes assigned.</p>}

        {cards.map(({ s, plan }) => (
          <div className="rs-cls" key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Y{s.yearLevel} {s.name}</h2>
              <span style={{ fontSize: 13, color: '#5e6b7c' }}>{DAY[s.dayOfWeek]} · {s.startTime}-{s.endTime}</span>
            </div>

            {plan.hasOutline && (
              <p style={{ fontSize: 13, marginTop: 6 }}>
                <b>Teach:</b> {plan.topic?.topic ?? 'current unit'}
                {plan.nextAssessment ? ` · Next assessment: ${plan.nextAssessment.title} (${format(plan.nextAssessment.date, 'd MMM')})` : ''}
                {plan.materials.length ? ` · Print: ${plan.materials.map((m) => m.title).join('; ')}` : ''}
              </p>
            )}

            <table className="rs-table">
              <thead>
                <tr><th style={{ width: '55%' }}>Student</th><th>Present</th><th>Late</th><th>Absent</th></tr>
              </thead>
              <tbody>
                {s.enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>{e.student.firstName} {e.student.lastName}</td>
                    <td><span className="rs-box" /></td>
                    <td><span className="rs-box" /></td>
                    <td><span className="rs-box" /></td>
                  </tr>
                ))}
                {s.enrollments.length === 0 && <tr><td colSpan={4} style={{ color: '#94a3b8' }}>No students enrolled</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
