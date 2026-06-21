import { prisma } from '@/lib/db'
import { aiEnabled } from '@/lib/ai'
import { cachedText } from '@/lib/ai-cache'

/**
 * Auto-drafted end-of-term reports. For every active enrolment in a term we
 * assemble the real signals - attendance, recent lesson notes, the questions the
 * student asked - and draft a short, warm, parent-facing comment for a human to
 * review and publish. Drafts are created unpublished; nothing reaches a parent
 * without an admin pressing Publish.
 *
 * Cost: the draft goes through cachedText (report tier = Sonnet, cache + budget
 * aware). Signals are pure SQL. Batchable from the nightly runner (lib/batch.ts).
 */

const AU = 'Use Australian English. Be warm, concise and honest. Do not use em dashes.'

export type ReportInput = {
  studentId: string
  subjectId: string
  studentName: string
  subjectName: string
  pct: number | null
  late: number
  absent: number
  topics: string[]
  existingReportId: string | null
}

/** The system + user prompt for one report - shared by the sync and Batch paths. */
export function reportPrompt(input: ReportInput): { system: string; user: string } {
  return {
    system: `You write a short, warm, parent-facing end-of-term tutoring report comment (2-3 sentences). ${AU} Base it only on the data given - never invent marks or specifics. Encouraging but honest about attendance.`,
    user: `Student: ${input.studentName}\nSubject: ${input.subjectName}\nAttendance: ${input.pct ?? 'n/a'}% (${input.late} late, ${input.absent} absent)\nRecent topics/notes: ${input.topics.join('; ') || 'n/a'}`,
  }
}

export function deterministicComment(input: { studentName: string; subjectName: string; pct: number | null; late: number; absent: number; topics: string[] }): string {
  const parts: string[] = []
  parts.push(`${input.studentName} attended ${input.pct ?? 0}% of ${input.subjectName} classes this term${input.late ? ` and was late ${input.late} time${input.late === 1 ? '' : 's'}` : ''}.`)
  if ((input.absent ?? 0) > 2) parts.push('Building a more regular attendance habit will help momentum next term.')
  if (input.topics.length) parts.push(`Recent focus has been on ${input.topics[0].toLowerCase().replace(/\.$/, '')}.`)
  parts.push(`${input.studentName} has shown steady effort and we look forward to continuing next term.`)
  return parts.join(' ')
}

async function draftComment(input: ReportInput): Promise<string> {
  if (!aiEnabled) return deterministicComment(input)
  try {
    const { system, user } = reportPrompt(input)
    const text = await cachedText({ task: 'report', maxTokens: 300, system, messages: [{ role: 'user', content: user }] })
    return text || deterministicComment(input)
  } catch {
    return deterministicComment(input)
  }
}

/** Gather the per-enrolment report inputs for a term (pure SQL, no AI). */
export async function gatherTermReportInputs(opts?: { termId?: string; regenerate?: boolean }): Promise<{ term: { id: string; name: string } | null; inputs: ReportInput[] }> {
  const term = opts?.termId
    ? await prisma.term.findUnique({ where: { id: opts.termId } })
    : await prisma.term.findFirst({ where: { isActive: true } })
  if (!term) return { term: null, inputs: [] }

  const enrolments = await prisma.enrollment.findMany({
    where: { status: 'active', subject: { termId: term.id } },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
    },
  })

  const inputs: ReportInput[] = []
  for (const e of enrolments) {
    const existing = await prisma.report.findFirst({ where: { studentId: e.studentId, subjectId: e.subjectId, termId: term.id }, select: { id: true } })
    if (existing && !opts?.regenerate) continue
    const [attendance, notes] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId: e.studentId, subjectId: e.subjectId }, select: { status: true } }),
      prisma.studentNote.findMany({ where: { studentId: e.studentId, category: { in: ['academic', 'general'] } }, orderBy: { createdAt: 'desc' }, take: 3, select: { body: true } }),
    ])
    const total = attendance.length
    const present = attendance.filter((a) => a.status === 'present' || a.status === 'late').length
    inputs.push({
      studentId: e.studentId,
      subjectId: e.subjectId,
      studentName: e.student.firstName,
      subjectName: e.subject.name,
      pct: total > 0 ? Math.round((present / total) * 100) : null,
      late: attendance.filter((a) => a.status === 'late').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      topics: notes.map((n) => n.body),
      existingReportId: existing?.id ?? null,
    })
  }
  return { term: { id: term.id, name: term.name }, inputs }
}

/** Write (create or update) a single report from an input + comment. */
export async function writeReport(termId: string, input: ReportInput, comment: string): Promise<void> {
  if (input.existingReportId) {
    await prisma.report.update({ where: { id: input.existingReportId }, data: { comment, attendancePct: input.pct, published: false } })
  } else {
    await prisma.report.create({ data: { studentId: input.studentId, subjectId: input.subjectId, termId, comment, attendancePct: input.pct, published: false } })
  }
}

export type TermReportResult = { created: number; skipped: number; termName: string; live: boolean }

/**
 * Draft reports for every active enrolment in a term. Idempotent: an enrolment
 * that already has a report for the term is skipped unless regenerate is true.
 */
export async function generateTermReports(opts?: { termId?: string; regenerate?: boolean }): Promise<TermReportResult> {
  const { term, inputs } = await gatherTermReportInputs(opts)
  if (!term) return { created: 0, skipped: 0, termName: 'No active term', live: aiEnabled }

  // skipped = active enrolments that already had a report (excluded from inputs).
  const totalEnrolments = await prisma.enrollment.count({ where: { status: 'active', subject: { termId: term.id } } })

  let created = 0
  for (const input of inputs) {
    const comment = await draftComment(input)
    await writeReport(term.id, input, comment)
    created++
  }

  return { created, skipped: Math.max(0, totalEnrolments - created), termName: term.name, live: aiEnabled }
}
