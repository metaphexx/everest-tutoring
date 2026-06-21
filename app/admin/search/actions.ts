'use server'

import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { semanticSearch, buildSearchIndex, type SemanticHit } from '@/lib/search'

const DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type SearchResults = {
  students: { id: string; name: string; meta: string; status: string }[]
  people: { id: string; name: string; email: string; phone: string | null; role: string; studentId: string | null }[]
  classes: { id: string; name: string; meta: string }[]
  questions: { id: string; title: string; meta: string }[]
}

// Fast multi-field admin lookup: students, parents/tutors (incl. email + phone),
// and classes. SQLite LIKE is case-insensitive for ASCII, so `contains` matches
// any case. Capped per category so it stays snappy.
export async function adminSearch(raw: string): Promise<SearchResults> {
  await requireUser(['admin'])
  const q = raw.trim()
  if (q.length < 2) return { students: [], people: [], classes: [], questions: [] }

  const [students, people, classes, questions] = await Promise.all([
    prisma.student.findMany({
      where: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }] },
      select: { id: true, firstName: true, lastName: true, yearLevel: true, status: true, parent: { select: { name: true } } },
      take: 8,
      orderBy: { firstName: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['parent', 'tutor'] },
        OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
      },
      select: { id: true, name: true, email: true, phone: true, role: true, students: { select: { id: true }, take: 1 } },
      take: 8,
    }),
    prisma.subject.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, yearLevel: true, dayOfWeek: true, startTime: true, term: { select: { name: true, isActive: true } }, _count: { select: { enrollments: { where: { status: 'active' } } } } },
      take: 8,
      orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }],
    }),
    prisma.question.findMany({
      where: { OR: [{ title: { contains: q } }, { body: { contains: q } }] },
      select: { id: true, title: true, status: true, student: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
      take: 8,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    students: students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      meta: `Year ${s.yearLevel} · ${s.parent.name ?? 'parent'}`,
      status: s.status,
    })),
    people: people.map((u) => ({
      id: u.id,
      name: u.name ?? '(no name)',
      email: u.email,
      phone: u.phone,
      role: u.role,
      studentId: u.students[0]?.id ?? null,
    })),
    classes: classes.map((c) => ({
      id: c.id,
      name: `Y${c.yearLevel} ${c.name}`,
      meta: `${DAY[c.dayOfWeek]} ${c.startTime} · ${c._count.enrollments} enrolled · ${c.term?.name ?? ''}${c.term?.isActive ? '' : ' (other term)'}`,
    })),
    questions: questions.map((qn) => ({
      id: qn.id,
      title: qn.title,
      meta: `${qn.student.firstName} ${qn.student.lastName} · ${qn.class.name} · ${qn.status.replace(/_/g, ' ')}`,
    })),
  }
}

// ── Semantic search ───────────────────────────────────────────────────────────

export type SemanticResults = { hits: SemanticHit[]; live: boolean; indexed: number }

/** Meaning-based search across the indexed CRM records. */
export async function semanticAdminSearch(raw: string): Promise<SemanticResults> {
  await requireUser(['admin'])
  return semanticSearch(raw, 8)
}

/** Rebuild the semantic index (and embeddings) on demand. */
export async function rebuildSearchIndex(): Promise<{ indexed: number; model: string }> {
  await requireUser(['admin'])
  return buildSearchIndex()
}
