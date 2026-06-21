import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getStudentForUser, getStudentClasses } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import AskComposer, { type MaterialOption } from '@/components/student/AskComposer'

export const metadata: Metadata = { title: 'Ask for help | Everest Tutoring' }

export default async function AskPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classParam } = await searchParams
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) {
    return (
      <StudentShell sub="Ask for help">
        <p className="text-sm text-slate-500">Your student profile is being set up.</p>
      </StudentShell>
    )
  }

  const classes = await getStudentClasses(student.id)
  const [outlines, documents] = await Promise.all([
    prisma.studentCourseOutline.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' } }),
    prisma.schoolDocument.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: 'desc' } }),
  ])
  const materials: MaterialOption[] = [
    ...outlines.map((o) => ({ id: o.id, label: `${o.subject} course outline`, sourceType: 'course_outline' as const })),
    ...documents.map((d) => ({ id: d.id, label: d.title, sourceType: 'school_document' as const })),
  ]

  return (
    <StudentShell sub="Ask for help">
      <Link href="/student" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="mb-4">
        <h1 className="portal-title">Ask for help</h1>
        <p className="portal-lede">Stuck on something? Ask your tutor privately, or share it with your class so everyone can learn from the answer.</p>
      </div>

      <AskComposer
        classes={classes.map((c) => ({ id: c.id, name: c.name, yearLevel: c.yearLevel }))}
        materials={materials}
        defaultClassId={classes.some((c) => c.id === classParam) ? classParam : undefined}
        autoFocus
      />

      <p className="flex items-start gap-2 text-xs text-slate-500 mt-4 max-w-xl">
        <ShieldCheck size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
        Your questions and messages are visible to the Everest team to keep the learning environment safe. Please only contact your tutor through Everest.
      </p>
    </StudentShell>
  )
}
