import { prisma } from '@/lib/db'
import { aiEnabled, aiMessage, firstText } from '@/lib/ai'
import { notifyAdmin } from '@/lib/admin-notify'

/**
 * Course-outline intelligence. HSHS uploads an outline per year+subject; the AI
 * scans the text to pull (a) assessment dates and (b) the week-by-week topic
 * plan. Assessments become AssessmentDate rows (shared with tutors + the
 * calendar); topics are stored on the outline and power tutor teaching
 * recommendations (lib/teaching.ts).
 *
 * Live via Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * extractor that still pulls dated lines and bullet topics out of the text.
 */

export type ExtractedAssessment = { title: string; date: string; weight?: string }
export type ExtractedTopic = { week: number | null; topic: string; focus?: string }
export type OutlineScan = {
  assessments: ExtractedAssessment[]
  topics: ExtractedTopic[]
  summary: string
}

export async function scanCourseOutline(
  rawText: string,
  meta: { yearLevel: number; subject: string },
): Promise<OutlineScan> {
  if (aiEnabled) {
    try {
      const msg = await aiMessage({
        task: 'analytics',
        maxTokens: 1500,
        system:
          `You read a school course outline and extract structured data for a tutoring team. Australian English. ` +
          `Extract every assessment (tests, exams, assignments) with its title and date (ISO yyyy-mm-dd; infer the year as the current school year if only a day/month is given), and any stated weighting. ` +
          `Extract the week-by-week topic plan as a list. Only use what is in the outline; do not invent assessments or topics. ` +
          `Return JSON only.`,
        jsonSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            assessments: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: { title: { type: 'string' }, date: { type: 'string' }, weight: { type: 'string' } },
                required: ['title', 'date'],
              },
            },
            topics: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: { week: { type: ['integer', 'null'] }, topic: { type: 'string' }, focus: { type: 'string' } },
                required: ['week', 'topic'],
              },
            },
            summary: { type: 'string' },
          },
          required: ['assessments', 'topics', 'summary'],
        },
        messages: [
          { role: 'user', content: `Year ${meta.yearLevel} ${meta.subject} course outline:\n\n${rawText}` },
        ],
      })
      const parsed = JSON.parse(firstText(msg)) as OutlineScan
      if (parsed.assessments && parsed.topics) return parsed
    } catch {
      // fall through to deterministic extraction
    }
  }
  return stubScan(rawText, meta)
}

// ── Deterministic fallback: pull dated lines (assessments) and bullet/"Week N"
// lines (topics) straight out of the text. Good enough to demo without a key. ──
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function parseDate(s: string): string | null {
  // 25/07/2026 or 25-07-26
  let m = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/)
  if (m) {
    const d = +m[1], mo = +m[2]
    let y = +m[3]
    if (y < 100) y += 2000
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  // 25 July (2026) or July 25
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?\b/) || s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?\b/)
  if (m) {
    const monthName = (m[2].length >= 3 && isNaN(+m[2]) ? m[2] : m[1]).slice(0, 3).toLowerCase()
    const day = isNaN(+m[1]) ? +m[2] : +m[1]
    const mo = MONTHS[monthName]
    if (mo) {
      const y = m[3] ? +m[3] : new Date().getFullYear()
      return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  return null
}

// Word-stems (no trailing boundary) so "examination", "assessment", "assignment",
// "investigation" etc. all match.
const ASSESS_HINT = /\b(test|exam|assess|assign|quiz|essay|task|investigat|project|prac)/i

function stubScan(rawText: string, meta: { yearLevel: number; subject: string }): OutlineScan {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const assessments: ExtractedAssessment[] = []
  const topics: ExtractedTopic[] = []

  for (const line of lines) {
    const date = parseDate(line)
    if (date && ASSESS_HINT.test(line)) {
      const title = line
        .replace(/^[\s*•-]+/, '') // leading bullet
        .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/, '') // numeric date
        .replace(/\b\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?\b/, '') // textual date
        .replace(/[-–:]\s*$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
      assessments.push({ title: title || `${meta.subject} assessment`, date })
      continue
    }
    const wk = line.match(/\bweek\s*(\d{1,2})\b[:\s-]*(.*)/i)
    if (wk) {
      topics.push({ week: +wk[1], topic: (wk[2] || '').trim() || `Week ${wk[1]}` })
      continue
    }
    // Bulleted topic lines
    const bullet = line.match(/^[-*•]\s*(.+)/)
    if (bullet && !date) topics.push({ week: null, topic: bullet[1].trim() })
  }

  const summary = `Found ${assessments.length} assessment${assessments.length === 1 ? '' : 's'} and ${topics.length} topic${topics.length === 1 ? '' : 's'} in this Year ${meta.yearLevel} ${meta.subject} outline. (Preview extraction - connect an ANTHROPIC_API_KEY for richer parsing.)`
  return { assessments, topics, summary }
}

/**
 * Store an uploaded outline and run the scan: persists the outline + topics,
 * creates AssessmentDate rows (deduped), and notifies the admin team.
 */
export async function ingestOutline(input: {
  yearLevel: number
  subject: string
  fileName: string
  sourceUrl?: string | null
  rawText: string
  uploadedById?: string | null
}) {
  const term = await prisma.term.findFirst({ where: { isActive: true } })
  const outline = await prisma.courseOutline.create({
    data: {
      yearLevel: input.yearLevel,
      subject: input.subject,
      termId: term?.id ?? null,
      fileName: input.fileName,
      sourceUrl: input.sourceUrl ?? null,
      rawText: input.rawText,
      uploadedById: input.uploadedById ?? null,
      status: 'uploaded',
    },
  })

  let scan: OutlineScan
  try {
    scan = await scanCourseOutline(input.rawText, { yearLevel: input.yearLevel, subject: input.subject })
  } catch {
    await prisma.courseOutline.update({ where: { id: outline.id }, data: { status: 'failed' } })
    return { outlineId: outline.id, assessmentsAdded: 0, topics: 0, status: 'failed' as const }
  }

  // Create assessment dates (dedupe by subject + title + date).
  let added = 0
  for (const a of scan.assessments) {
    const when = new Date(`${a.date}T00:00:00`)
    if (isNaN(when.getTime())) continue
    const exists = await prisma.assessmentDate.findFirst({
      where: { yearLevel: input.yearLevel, subject: input.subject, title: a.title, date: when },
    })
    if (exists) continue
    await prisma.assessmentDate.create({
      data: {
        yearLevel: input.yearLevel,
        subject: input.subject,
        title: a.title,
        date: when,
        notes: a.weight ? `Weighting: ${a.weight} (from course outline)` : 'From course outline',
        createdById: input.uploadedById ?? null,
      },
    })
    added++
  }

  await prisma.courseOutline.update({
    where: { id: outline.id },
    data: { status: 'scanned', topics: JSON.stringify(scan.topics), scanSummary: scan.summary, scannedAt: new Date() },
  })

  await notifyAdmin({
    type: 'outline',
    title: `Course outline scanned: Y${input.yearLevel} ${input.subject}`,
    body: `${added} assessment date${added === 1 ? '' : 's'} and ${scan.topics.length} topic${scan.topics.length === 1 ? '' : 's'} extracted and shared with tutors.`,
    href: '/admin/partner',
    refKey: `outline:${outline.id}`,
  })

  return { outlineId: outline.id, assessmentsAdded: added, topics: scan.topics.length, status: 'scanned' as const }
}

export type ParsedTopic = ExtractedTopic
export function parseTopics(json: string | null): ParsedTopic[] {
  if (!json) return []
  try {
    const t = JSON.parse(json)
    return Array.isArray(t) ? t : []
  } catch {
    return []
  }
}
