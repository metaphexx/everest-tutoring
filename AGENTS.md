<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent brief — Everest Tutoring × HSHS

You're working on a full-stack Next.js 16 (App Router) + TypeScript + Prisma 7 +
Tailwind v4 app: a marketing site, Stripe-checkout booking, and Parent/Student/
Tutor/Admin portals + a read-only HSHS school portal, with a CRM, an AI assistant
("Elliot"), AI chat moderation, and a tamper-evident audit trail.

## Read these first
- **HANDOFF.md** — setup, deploy, what's done/pending, and the UI-fidelity rules.
- **FEATURES.md** — every feature and how it works (your map of the system).
- **DESIGN.md** — the design system spec.
- **PORTAL_DASHBOARDS.md** — how to build new portal dashboards on the existing visual language.
- **DEV_NOTES.md** — integration setup + remaining to-dos.

## The #1 rule: do not change how the UI looks
The owner cares deeply about design and was previously burned by a handoff that
drifted (wrong fonts/spacing/colours). Fidelity is enforced by structure — keep it:
- **Fonts** are self-hosted via `next/font` in `app/layout.tsx` (Montserrat
  display, Inter body). Reference `var(--font-display|body|ui)` only;
  never hardcode a font name.
- **All colours/spacing/radii/shadows are tokens** in `app/globals.css :root`
  (`--brand-*`, `--ink-*`, `--navy-*`, `--glass-bg`, `--hairline`, `--ring`, …).
  Never introduce a raw hex; add a token first if truly needed.
- **All controls go through `components/ui/` primitives** (`Button`, `Badge`,
  `Card`/`EmptyState`, `Table`, `Tabs`, `Dialog`, `Tooltip`, `Toaster`). Don't
  hand-roll buttons/badges/dialogs — add a variant to the primitive instead.
- Mobile-first: tables collapse to cards below `sm`, 44px touch targets. Verify
  changed UI at **375px and 1280px**.

## Conventions
- **Pages are thin; logic lives in `lib/*` and server actions.** Start at
  `prisma/schema.prisma` (data model) and `lib/` (behaviour).
- **Australian English. No em dashes** (use hyphens) anywhere user-facing.
- **Every integration degrades gracefully** without its key (preview/stub mode).
  Preserve that — guard with the `has*`/`*Enabled` flags, always provide a fallback.
- **Auth/roles**: gate with `requireUser([roles])`; admin passes every check.
- **Audit**: writes through the `prisma` client in `lib/db.ts` are auto-audited;
  use `rawPrisma` only to deliberately bypass soft-delete/audit (e.g. test cleanup).
- **AI**: route model selection through `lib/ai.ts` `modelFor(task)`; prefer the
  cost-aware `cachedText` in `lib/ai-cache.ts`; never change prompts to swap models.

## Verify before you finish
Green gate: `npx tsc --noEmit` (0) · `npx eslint .` (0) · `npx vitest run` ·
`npm run build`. After a Prisma migration, restart the dev server (it otherwise
serves a stale client). Tests run against `dev.db` — use `rawPrisma` for hard
deletes in teardown (the soft-delete extension turns `deleteMany` into stamps).

## Status
Done & green at handoff: the full platform + AI + audit + design system + branded
email + moderation→incident. Pending = config/keys/Postgres/legal, not code — see
HANDOFF.md §7.
