import { prisma } from '@/lib/db'
import { embed, cosine, embeddingsLive, LOCAL_MODEL } from '@/lib/embeddings'
import { recordUsage } from '@/lib/ai-cost'

/**
 * Semantic search over the CRM. We keep a SearchDocument per record (student,
 * question, note, resource, class) holding the text we embedded and its vector.
 * buildSearchIndex() (re)builds the documents and their embeddings - run it from
 * the admin search page or the nightly batch. semanticSearch() embeds the query
 * and ranks documents by cosine similarity. Embeddings are provided by
 * lib/embeddings.ts (Voyage when configured, deterministic local fallback).
 */

export type IndexedDoc = { entity: string; entityId: string; title: string; body: string; url: string }

async function gatherDocs(): Promise<IndexedDoc[]> {
  const [students, questions, notes, resources, classes] = await Promise.all([
    prisma.student.findMany({ select: { id: true, firstName: true, lastName: true, yearLevel: true, status: true } }),
    prisma.question.findMany({ where: { blocked: false }, select: { id: true, title: true, body: true, status: true } }),
    prisma.studentNote.findMany({ select: { id: true, body: true, category: true, studentId: true } }),
    prisma.tutorResource.findMany({ select: { id: true, title: true, description: true, subject: true, topic: true } }),
    prisma.subject.findMany({ select: { id: true, name: true, yearLevel: true, dayOfWeek: true } }),
  ])

  const docs: IndexedDoc[] = []
  for (const s of students) docs.push({ entity: 'Student', entityId: s.id, title: `${s.firstName} ${s.lastName}`, body: `Student ${s.firstName} ${s.lastName} Year ${s.yearLevel} ${s.status}`, url: `/admin/students/${s.id}` })
  for (const q of questions) docs.push({ entity: 'Question', entityId: q.id, title: q.title, body: `${q.title}. ${q.body} (${q.status})`, url: '/admin/questions' })
  for (const n of notes) docs.push({ entity: 'StudentNote', entityId: n.id, title: `Note (${n.category})`, body: n.body, url: `/admin/students/${n.studentId}` })
  for (const r of resources) docs.push({ entity: 'TutorResource', entityId: r.id, title: r.title, body: `${r.title}. ${r.description ?? ''} ${r.subject} ${r.topic ?? ''}`, url: '/admin/resources' })
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const c of classes) docs.push({ entity: 'Subject', entityId: c.id, title: c.name, body: `Class ${c.name} Year ${c.yearLevel} ${DAY[c.dayOfWeek] ?? ''}`, url: `/admin/classes/${c.id}` })
  return docs
}

/** (Re)build the search index and embeddings. Returns the document count. */
export async function buildSearchIndex(): Promise<{ indexed: number; model: string }> {
  const docs = await gatherDocs()
  const { vectors, model } = await embed(docs.map((d) => d.body))

  // Drop stale documents (records that no longer exist), then upsert current ones.
  const keep = new Set(docs.map((d) => `${d.entity}:${d.entityId}`))
  const existing = await prisma.searchDocument.findMany({ select: { id: true, entity: true, entityId: true } })
  const staleIds = existing.filter((e) => !keep.has(`${e.entity}:${e.entityId}`)).map((e) => e.id)
  if (staleIds.length) await prisma.searchDocument.deleteMany({ where: { id: { in: staleIds } } })

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]
    const embedding = JSON.stringify(vectors[i] ?? [])
    await prisma.searchDocument.upsert({
      where: { entity_entityId: { entity: d.entity, entityId: d.entityId } },
      create: { entity: d.entity, entityId: d.entityId, title: d.title, body: d.body.slice(0, 500), url: d.url, embedding, model },
      update: { title: d.title, body: d.body.slice(0, 500), url: d.url, embedding, model },
    })
  }
  // The local fallback is free; only meter real provider calls.
  if (model !== LOCAL_MODEL) {
    const tokens = docs.reduce((s, d) => s + Math.ceil(d.body.length / 4), 0)
    await recordUsage({ task: 'embedding', model, inputTokens: tokens, outputTokens: 0 })
  }
  return { indexed: docs.length, model }
}

export type SemanticHit = { entity: string; entityId: string; title: string; snippet: string; url: string | null; score: number }

/** Rank indexed documents by semantic similarity to the query. */
export async function semanticSearch(query: string, limit = 8): Promise<{ hits: SemanticHit[]; live: boolean; indexed: number }> {
  const q = query.trim()
  if (q.length < 2) return { hits: [], live: embeddingsLive, indexed: 0 }

  const docs = await prisma.searchDocument.findMany({ where: { embedding: { not: null } } })
  if (docs.length === 0) return { hits: [], live: embeddingsLive, indexed: 0 }

  const { vectors } = await embed([q])
  const qv = vectors[0] ?? []

  const scored = docs.map((d) => {
    let vec: number[] = []
    try { vec = JSON.parse(d.embedding ?? '[]') as number[] } catch { vec = [] }
    return { d, score: cosine(qv, vec) }
  })
  scored.sort((a, b) => b.score - a.score)

  const hits = scored
    .filter((s) => s.score > 0.05)
    .slice(0, limit)
    .map((s) => ({ entity: s.d.entity, entityId: s.d.entityId, title: s.d.title, snippet: s.d.body.slice(0, 140), url: s.d.url, score: Math.round(s.score * 100) / 100 }))
  return { hits, live: embeddingsLive, indexed: docs.length }
}
