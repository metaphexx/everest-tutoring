import type { Metadata } from 'next'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getStudentForUser, getStudentClasses } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import AssessmentTracker, { type AssessmentItem } from '@/components/student/AssessmentTracker'
import SchoolMaterialsClient, { type OutlineCard, type DocCard } from './SchoolMaterialsClient'

export const metadata: Metadata = { title: 'School materials | Everest Tutoring' }

function fmt(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default async function SchoolMaterialsPage({ searchParams }: { searchParams: Promise<{ upload?: string }> }) {
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) {
    return <StudentShell sub="School materials"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>
  }

  const { upload } = await searchParams
  const initialOpen = upload === 'outline' ? 'outline' : upload === 'document' ? 'document' : null

  const [classes, term, outlinesRaw, documentsRaw, assessmentsRaw] = await Promise.all([
    getStudentClasses(student.id),
    prisma.term.findFirst({ where: { isActive: true }, select: { name: true } }),
    prisma.studentCourseOutline.findMany({ where: { studentId: student.id }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
    prisma.schoolDocument.findMany({ where: { studentId: student.id }, include: { file: { select: { url: true } } }, orderBy: { uploadedAt: 'desc' } }),
    prisma.studentAssessment.findMany({ where: { studentId: student.id }, orderBy: { dueDate: 'asc' } }),
  ])

  const subjects = Array.from(new Set([...classes.map((c) => c.name), 'Maths', 'English', 'Science']))
  const outlines: OutlineCard[] = outlinesRaw.map((o) => ({
    id: o.id, subject: o.subject, term: o.term, fileUrl: o.file?.url ?? null,
    uploadedAt: fmt(o.uploadedAt), assessmentCount: o.assessmentCount, extractionStatus: o.extractionStatus,
  }))
  const documents: DocCard[] = documentsRaw.map((d) => ({
    id: d.id, title: d.title, documentType: d.documentType, subject: d.subject,
    fileUrl: d.file?.url ?? null, uploadedAt: fmt(d.uploadedAt), moderationStatus: d.moderationStatus,
  }))
  const assessments: AssessmentItem[] = assessmentsRaw.map((a) => ({
    id: a.id, subject: a.subject, title: a.title, kind: a.kind, dueWeek: a.dueWeek, dueDate: a.dueDate, notes: a.notes,
  }))

  return (
    <StudentShell sub="School materials">
      <div className="mb-5">
        <h1 className="portal-title">School materials</h1>
        <p className="portal-lede">Upload your real school work so your tutor can help with exactly what you are doing in class.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SchoolMaterialsClient
            outlines={outlines}
            documents={documents}
            subjects={subjects}
            defaultTerm={term?.name ?? 'This term'}
            initialOpen={initialOpen}
          />
        </div>
        <div>
          <AssessmentTracker items={assessments} />
        </div>
      </div>
    </StudentShell>
  )
}
