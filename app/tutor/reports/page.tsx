import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import ReportEditor from './ReportEditor'

export const metadata = { title: 'Reports · Tutor' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function TutorReportsPage() {
  const user = await requireUser(['tutor'])
  const term = await prisma.term.findFirst({ where: { isActive: true } })

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, tutorId: user.id },
    include: { enrollments: { where: { status: 'active' }, include: { student: true } } },
    orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }],
  })

  const studentIds = subjects.flatMap((s) => s.enrollments.map((e) => e.studentId))
  const reports = term && studentIds.length
    ? await prisma.report.findMany({ where: { studentId: { in: studentIds }, termId: term.id } })
    : []
  const reportFor = (studentId: string, subjectId: string) => reports.find((r) => r.studentId === studentId && r.subjectId === subjectId)

  const cards = subjects.flatMap((s) =>
    s.enrollments.map((e) => ({ subject: s, student: e.student, report: reportFor(e.student.id, s.id) })),
  )

  return (
    <PortalShell eyebrow="Tutor" sub="End-of-term reports" user={user}>
      <h1 className="portal-title">End-of-term reports</h1>
      <p className="portal-lede">Write a comment for each student, or let Elliot draft one from their attendance and lesson notes. An admin publishes them to parents.</p>

      {cards.length === 0 ? (
        <div className="glass-card glass-card-pad text-center mt-5">
          <p className="text-slate-500">No students in your classes yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-5">
          {cards.map(({ subject, student, report }) => (
            <ReportEditor
              key={`${subject.id}-${student.id}`}
              studentId={student.id}
              subjectId={subject.id}
              studentName={`${student.firstName} ${student.lastName}`}
              subjectName={subject.name}
              yearLevel={student.yearLevel}
              color={YEAR_COLORS[student.yearLevel] ?? '#009dff'}
              initialEffort={report?.effort ?? null}
              initialComment={report?.comment ?? null}
              published={report?.published ?? false}
            />
          ))}
        </div>
      )}
    </PortalShell>
  )
}
