import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { getAuditActor, AUDITED_MODELS, SOFT_DELETE_MODELS, scalarSnapshot } from '@/lib/audit-context'
import { rowHash } from '@/lib/audit-chain'

const DB_URL = process.env.DATABASE_URL ?? 'file:./dev.db'
const isPostgres = /^postgres(ql)?:\/\//.test(DB_URL)

function createPrismaClient() {
  // Production runs on Postgres. To enable: `npm i @prisma/adapter-pg pg`, set
  // provider = "postgresql" in schema.prisma, reset migrations, and set a
  // postgres:// DATABASE_URL. See DEV_NOTES.md for the full switch.
  if (isPostgres) {
    throw new Error(
      'DATABASE_URL is Postgres but the Postgres adapter is not wired yet. See DEV_NOTES.md "Postgres for production".',
    )
  }
  const adapter = new PrismaBetterSqlite3({ url: DB_URL })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

// The raw client. Audit reads/writes use this so they never recurse through the
// extension and never appear in the trail themselves. Also exported as
// `rawPrisma` for the trash view, which must see soft-deleted rows that the
// extended client hides.
const base = createPrismaClient()

/** Unfiltered client - bypasses soft-delete hiding. Use sparingly (trash, restore). */
export const rawPrisma = base

// Best-effort audit write. Never throws - a logging hiccup must not break the
// underlying mutation. Only user-initiated changes (an actor is present) are
// recorded; system/cron writes pass through untouched. Each row is hash-chained
// to the previous one so the history is tamper-evident (see lib/audit-chain.ts).
async function writeAudit(
  kind: 'create' | 'update' | 'delete',
  model: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  try {
    const actor = getAuditActor()
    if (!actor?.id) return // skip system/seed/cron writes
    const beforeJson = before ? JSON.stringify(scalarSnapshot(before)) : null
    const afterJson = after ? JSON.stringify(scalarSnapshot(after)) : null
    const createdAt = new Date()

    // Link to the previous hashed row to form the tamper-evident chain.
    const prev = await base.auditLog.findFirst({
      where: { hash: { not: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { hash: true },
    })
    const prevHash = prev?.hash ?? null
    const hash = rowHash(prevHash, {
      actorId: actor.id ?? null,
      action: `${model}.${kind}`,
      kind,
      entity: model,
      entityId,
      before: beforeJson,
      after: afterJson,
      createdAt: createdAt.toISOString(),
    })

    await base.auditLog.create({
      data: {
        actorId: actor.id ?? null,
        actorName: actor.name ?? null,
        actorRole: actor.role ?? null,
        action: `${model}.${kind}`,
        kind,
        entity: model,
        entityId,
        before: beforeJson,
        after: afterJson,
        ip: actor.ip ?? null,
        userAgent: actor.userAgent ?? null,
        hash,
        prevHash,
        createdAt,
      },
    })
  } catch {
    /* never throw from the audit trail */
  }
}

function idOf(v: unknown): string | null {
  return v && typeof v === 'object' && 'id' in v ? String((v as { id: unknown }).id) : null
}

function delegateFor(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1)
  return (base as unknown as Record<string, {
    findFirst: (a: unknown) => Promise<unknown>
    update: (a: unknown) => Promise<unknown>
    updateMany: (a: unknown) => Promise<{ count: number }>
  }>)[key]
}

type WhereArgs = { where?: Record<string, unknown> }

// Add `deletedAt: null` to a read's filter for soft-deletable models, unless the
// caller already constrained deletedAt (so an explicit query can still opt in).
function hideDeleted(args: unknown): unknown {
  const a = (args ?? {}) as WhereArgs
  const where = a.where ?? {}
  if ('deletedAt' in where) return a
  return { ...a, where: { deletedAt: null, ...where } }
}

function createPrisma() {
  return base.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args)
          if (AUDITED_MODELS.has(model)) await writeAudit('create', model, idOf(result), null, result)
          return result
        },
        async update({ model, args, query }) {
          let before: unknown = null
          if (AUDITED_MODELS.has(model)) {
            try { before = await delegateFor(model)?.findFirst({ where: (args as WhereArgs).where }) } catch { /* ignore */ }
          }
          const result = await query(args)
          if (AUDITED_MODELS.has(model)) await writeAudit('update', model, idOf(result), before, result)
          return result
        },
        async delete({ model, args, query }) {
          // Soft-delete: convert the destructive delete into a deletedAt stamp so
          // an accidental deletion can be restored from the admin trash.
          if (SOFT_DELETE_MODELS.has(model)) {
            let before: unknown = null
            try { before = await delegateFor(model)?.findFirst({ where: (args as WhereArgs).where }) } catch { /* ignore */ }
            const stampedAt = new Date()
            const result = await delegateFor(model).update({ where: (args as WhereArgs).where, data: { deletedAt: stampedAt } })
            // Cascade: soft-deleting a Student also hides its soft-deletable
            // children so nothing dangles in the UI; restore (admin trash) reverses
            // it. Uses the base client to avoid recursion through the extension.
            if (model === 'Student') {
              const sid = idOf(before) ?? idOf(result)
              if (sid) {
                try {
                  await base.studentNote.updateMany({ where: { studentId: sid, deletedAt: null }, data: { deletedAt: stampedAt } })
                  await base.studentCredit.updateMany({ where: { studentId: sid, deletedAt: null }, data: { deletedAt: stampedAt } })
                } catch { /* best-effort cascade */ }
              }
            }
            if (AUDITED_MODELS.has(model)) await writeAudit('delete', model, idOf(before) ?? idOf(result), before, null)
            return result
          }
          let before: unknown = null
          if (AUDITED_MODELS.has(model)) {
            try { before = await delegateFor(model)?.findFirst({ where: (args as WhereArgs).where }) } catch { /* ignore */ }
          }
          const result = await query(args)
          if (AUDITED_MODELS.has(model)) await writeAudit('delete', model, idOf(before), before, null)
          return result
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            return delegateFor(model).updateMany({ where: (args as WhereArgs).where, data: { deletedAt: new Date() } })
          }
          return query(args)
        },
        async findMany({ model, args, query }) {
          return query((SOFT_DELETE_MODELS.has(model) ? hideDeleted(args) : args) as typeof args)
        },
        async count({ model, args, query }) {
          return query((SOFT_DELETE_MODELS.has(model) ? hideDeleted(args) : args) as typeof args)
        },
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrisma> }

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
