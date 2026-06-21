import { prisma } from '@/lib/db'

// Generic assessment shapes per subject, used by the placeholder extractor below
// until real AI extraction is wired. Weeks are relative to the term start.
const TEMPLATE: Record<string, { title: string; kind: 'test' | 'assignment' | 'exam' | 'investigation'; week: number }[]> = {
  Maths: [
    { title: 'Topic Test', kind: 'test', week: 5 },
    { title: 'Investigation', kind: 'investigation', week: 8 },
    { title: 'End of term exam', kind: 'exam', week: 10 },
  ],
  English: [
    { title: 'Persuasive essay', kind: 'assignment', week: 4 },
    { title: 'Text response', kind: 'assignment', week: 7 },
    { title: 'Oral presentation', kind: 'test', week: 9 },
  ],
  Science: [
    { title: 'Practical report', kind: 'assignment', week: 5 },
    { title: 'Research investigation', kind: 'investigation', week: 8 },
    { title: 'End of term exam', kind: 'exam', week: 10 },
  ],
}

function templateFor(subject: string) {
  const key = Object.keys(TEMPLATE).find((k) => subject.toLowerCase().includes(k.toLowerCase()))
  return key ? TEMPLATE[key] : TEMPLATE.Maths
}

function inferKind(title: string): 'test' | 'assignment' | 'exam' | 'investigation' {
  const t = title.toLowerCase()
  if (t.includes('exam')) return 'exam'
  if (t.includes('investigation') || t.includes('research')) return 'investigation'
  if (t.includes('assignment') || t.includes('essay') || t.includes('report') || t.includes('portfolio')) return 'assignment'
  return 'test'
}

/**
 * Build the Assessment Tracker from an uploaded course outline.
 *
 * Token-efficient: instead of re-running AI per student upload, we reuse the
 * AssessmentDate rows the platform already extracted (once, by AI) from the
 * official HSHS course outline for that year + subject - so each student's tracker
 * reflects the real curriculum at zero additional AI cost. If the school outline
 * hasn't been scanned yet, we fall back to a sensible per-subject template.
 */
export async function extractAssessmentsFromOutline(outlineId: string): Promise<number> {
  const outline = await prisma.studentCourseOutline.findUnique({ where: { id: outlineId } })
  if (!outline) return 0

  const [student, term] = await Promise.all([
    prisma.student.findUnique({ where: { id: outline.studentId }, select: { yearLevel: true } }),
    prisma.term.findFirst({ where: { isActive: true } }),
  ])
  const termStart = term?.startDate ?? new Date()
  const weekOf = (d: Date) => Math.max(1, Math.floor((d.getTime() - termStart.getTime()) / (7 * 86400000)) + 1)

  // Clear any prior extraction for this outline so re-uploads stay idempotent.
  await prisma.studentAssessment.deleteMany({ where: { outlineId } })

  // Reuse the AI-extracted official assessments for this year + subject.
  const official = student
    ? await prisma.assessmentDate.findMany({
        where: { subject: outline.subject, yearLevel: student.yearLevel, date: { gte: termStart } },
        orderBy: { date: 'asc' },
      })
    : []

  let created = 0
  const topics: string[] = []
  if (official.length > 0) {
    for (const a of official) {
      await prisma.studentAssessment.create({
        data: { studentId: outline.studentId, outlineId, subject: outline.subject, title: a.title, kind: inferKind(a.title), dueWeek: weekOf(a.date), dueDate: a.date, notes: a.notes ?? undefined },
      })
      topics.push(a.title)
      created++
    }
  } else {
    // Fallback template when the school outline hasn't been scanned yet.
    for (const r of templateFor(outline.subject)) {
      const dueDate = new Date(termStart)
      dueDate.setDate(termStart.getDate() + (r.week - 1) * 7)
      await prisma.studentAssessment.create({
        data: { studentId: outline.studentId, outlineId, subject: outline.subject, title: r.title, kind: r.kind, dueWeek: r.week, dueDate },
      })
      topics.push(r.title)
      created++
    }
  }

  await prisma.studentCourseOutline.update({
    where: { id: outlineId },
    data: { extractionStatus: 'done', assessmentCount: created, extractedTopics: JSON.stringify(topics) },
  })
  return created
}
