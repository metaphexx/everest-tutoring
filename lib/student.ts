import { prisma } from '@/lib/db'

export type StudentClass = {
  id: string // subject id
  name: string
  subject: string
  yearLevel: number
  dayOfWeek: number
  startTime: string
  endTime: string
  color: string
  tutorId: string | null
  tutorName: string | null
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The Student row owned by a signed-in student account (Student.userId is unique). */
export async function getStudentForUser(userId: string) {
  return prisma.student.findUnique({ where: { userId } })
}

/** Active-term classes the student is enrolled in, earliest weekday first. */
export async function getStudentClasses(studentId: string): Promise<StudentClass[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: 'active', subject: { term: { isActive: true } } },
    include: { subject: { include: { tutor: { select: { id: true, name: true } } } } },
    orderBy: { subject: { dayOfWeek: 'asc' } },
  })
  return enrollments.map((e) => ({
    id: e.subject.id,
    name: e.subject.name,
    subject: e.subject.name,
    yearLevel: e.subject.yearLevel,
    dayOfWeek: e.subject.dayOfWeek,
    startTime: e.subject.startTime,
    endTime: e.subject.endTime,
    color: e.subject.color,
    tutorId: e.subject.tutor?.id ?? null,
    tutorName: e.subject.tutor?.name ?? null,
  }))
}

/** Parse '15:15' or '3:15pm' into minutes from midnight. */
function toMinutes(t: string): number {
  const m = t.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  return h * 60 + min
}

/** Format a stored time ('15:15') for display ('3:15pm'). */
export function formatTime(t: string): string {
  const mins = toMinutes(t)
  let h = Math.floor(mins / 60)
  const min = mins % 60
  const mer = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(min).padStart(2, '0')}${mer}`
}

export function dayShort(dow: number) { return DAY_SHORT[dow % 7] }
export function dayLong(dow: number) { return DAY_LONG[dow % 7] }

/** Next date matching dayOfWeek (1=Mon..7=Sun) at startTime, at or after `from`. */
function nextOccurrence(dow: number, startTime: string, from: Date): Date {
  const target = dow % 7 // 7 (Sun) -> 0 to match Date.getDay()
  const mins = toMinutes(startTime)
  for (let i = 0; i < 8; i++) {
    const cand = new Date(from)
    cand.setDate(from.getDate() + i)
    cand.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    if (cand.getDay() === target && cand >= from) return cand
  }
  const fallback = new Date(from)
  fallback.setDate(from.getDate() + 7)
  return fallback
}

/** The student's next upcoming class occurrence. */
export function nextClass(classes: StudentClass[], from = new Date()): { cls: StudentClass; date: Date } | null {
  let best: { cls: StudentClass; date: Date } | null = null
  for (const c of classes) {
    const date = nextOccurrence(c.dayOfWeek, c.startTime, from)
    if (!best || date < best.date) best = { cls: c, date }
  }
  return best
}

/** A friendly relative label for an upcoming class date. */
export function whenLabel(date: Date, from = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(from)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return dayLong(date.getDay() === 0 ? 7 : date.getDay())
}

/** Subject accent colour by name, matching the brand palette used elsewhere. */
export function subjectColor(subject: string): string {
  const s = subject.toLowerCase()
  if (s.includes('math')) return '#009DFF'
  if (s.includes('english')) return '#7C5CFF'
  if (s.includes('science')) return '#22A05B'
  return '#009DFF'
}
