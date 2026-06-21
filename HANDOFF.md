# Everest Tutoring × HSHS — Developer Handoff

This is the master handoff. Read this first, then the linked docs.

| Doc | What's in it |
|---|---|
| **HANDOFF.md** (this) | How to get the code, set up, deploy, what's done/pending, and the UI-fidelity contract |
| [FEATURES.md](FEATURES.md) | Every feature in the system and exactly how it works |
| [DESIGN.md](DESIGN.md) | The design system spec (colours, type, components) |
| [DEV_NOTES.md](DEV_NOTES.md) | Integration-specific setup notes (Drive, Postgres, Sentry, inbound, credentials) |
| [PRODUCT.md](PRODUCT.md) | Product purpose, users, brand personality |
| [AGENTS.md](AGENTS.md) | Brief for an AI coding agent (most devs here use Claude) |
| [.env.example](.env.example) | Every environment variable, grouped and explained |

---

## 0. The one rule that matters most: do not let the UI drift

This handoff was prepared specifically because a previous handoff came back with
**different fonts, spacing and colours**. That must not happen again. The product
is designed to look exactly as shipped. **See §5 "UI fidelity contract" below — it
is not optional.** In short: the fonts are now self-hosted, every colour/spacing
value is a token, and all controls go through a small set of primitives. Don't
introduce new fonts, hex values, or bespoke buttons.

---

## 1. What this is

A full-stack **Next.js 16 (App Router) + TypeScript + Prisma + Tailwind v4** app:
a public marketing site, an online booking + Stripe checkout, and four signed-in
portals (Parent, Student, Tutor, Admin) plus a read-only HSHS school portal. It
includes a CRM, AI assistant ("Elliot"), AI moderation of student/tutor chat, a
tamper-evident audit trail, and a design system. One codebase, role-routed.

- **Framework:** Next.js 16.2.6 (Turbopack), React 19
- **DB/ORM:** Prisma 7 → SQLite in dev, Postgres in prod
- **Auth:** NextAuth (magic-link email)
- **Styling:** Tailwind v4 + CSS variables + a shadcn-style primitive set
- **Integrations (all optional/keyed):** Stripe, Resend (email), Twilio (SMS),
  Xero (invoicing), Anthropic (AI), Voyage (search embeddings), Google Drive,
  Meta Pixel/CAPI, Sentry

---

## 2. How to give the code to your developers

The whole project lives in this folder and is committed to git on the branch
**`feat/audit-ai-design-system`**. There is **no git remote configured yet**, so
the developers can't `git clone` it until you publish it. Two options:

**Option A — push to GitHub/GitLab (recommended).** From this folder:
```bash
git remote add origin <your-empty-repo-url>
git push -u origin feat/audit-ai-design-system   # or merge to main first, then push main
```
Then add the devs as collaborators. They `git clone` and get full history.

**Option B — send a zip.** Hand them a zip of this folder **excluding**
`node_modules`, `.next`, and `dev.db`:
```bash
git archive --format=zip -o everest-tutoring.zip HEAD   # clean export of tracked files only
```
`git archive` is best because it only includes committed files (no junk, no DB).

Either way they get: all source, `prisma/schema.prisma` + `prisma/migrations/`,
`.env.example`, and the docs. They will **not** get `.env.local` (secrets) or
`dev.db` (local data) — that's intentional.

---

## 3. Quick start (works with zero keys)

```bash
npm install
cp .env.example .env.local          # nothing is required to run; fill keys to go live
npx prisma migrate dev              # creates dev.db + applies all migrations
npx prisma db seed                  # loads demo term, classes, users, students
npm run dev                         # http://localhost:3000
```

Every integration runs in a safe **preview/stub mode** without its key — emails
and SMS are logged (visible in Admin → Communications) instead of sent, AI uses
deterministic fallbacks, Stripe/Xero compose but don't transact. So the app is
fully explorable immediately.

**Demo logins** (dev prints the magic-link to the server console — there's no
password). Trigger sign-in at `/login`, then open the `🔑 Magic sign-in link…`
URL from the terminal:
- `admin@everesttutoring.com.au` — Admin (passes every role check)
- `maths.tutor@everesttutoring.com.au` — Tutor
- `parent.demo@example.com` — Parent
- `emma.demo@example.com` / `liam.demo@example.com` — Student
- `partner@harrisdale.wa.edu.au` — HSHS school portal

**Scripts:** `npm run dev` · `npm run build` · `npm run start` ·
`npx tsc --noEmit` (types) · `npx eslint .` (lint) · `npx vitest run` (tests).

---

## 4. Going to production

1. **Database → Postgres.** Dev is SQLite; prod should be Postgres. Steps are in
   [DEV_NOTES.md](DEV_NOTES.md) "Postgres for production" (install
   `@prisma/adapter-pg pg`, set `provider = "postgresql"`, reset migrations, set
   a `postgres://` `DATABASE_URL`). `lib/db.ts` already detects the URL scheme.
2. **Set env vars** for each integration you want live — see [.env.example](.env.example).
   At minimum for a real launch: `AUTH_SECRET`, `DATABASE_URL`, Stripe keys,
   `RESEND_API_KEY` + verified `FROM_EMAIL`, and (for AI) `ANTHROPIC_API_KEY`.
3. **Deploy** (Vercel is the natural fit for Next.js). Set the same env vars in
   the host. Point Stripe/Twilio/email webhooks at the deployed URLs (see §6).
4. **Schedule the crons** (Vercel Cron or any scheduler), all `GET` with
   `Authorization: Bearer $CRON_SECRET`:
   - `/api/cron/reminders` — class reminders (daily)
   - `/api/cron/nudges` — proactive nudges, waitlist sweeps, re-enrolment lapse (daily)
   - `/api/cron/reenrolment` — auto-enrolment for next term (as needed)
   - `/api/cron/nightly` — rebuild search index, draft term reports, morning brief
     (daily; add `?transport=batch` to use the cheaper Anthropic Batch API)

---

## 5. UI fidelity contract — keep it looking exactly like this

The design is the product. Here is why it won't drift and the rules to keep it
that way. Full spec in [DESIGN.md](DESIGN.md).

**What guarantees fidelity (already in place):**
1. **Fonts are self-hosted** via `next/font` in `app/layout.tsx` — **Montserrat**
   (display/headings) and **Inter** (body/UI). They ship inside the
   build; there's no Google-Fonts request to be slow or blocked, and next/font
   adds size-adjusted fallbacks so there's no layout shift. *(The old stack listed
   a paid "Gotham" first that was never bundled and silently fell back — that
   ambiguity is removed.)*
2. **One source of truth for every value** — `app/globals.css :root` holds all
   colour, spacing, radius, shadow, and font tokens (`--brand-*`, `--ink-*`,
   `--navy-*`, `--font-display`, `--glass-bg`, `--hairline`, `--ring`, …).
3. **All controls go through primitives** in `components/ui/`: `Button`, `Badge`,
   `Card`/`EmptyState`, `Table`, `Tabs`, `Dialog`, `Tooltip`, `Toaster`. Buttons
   come in named variants (default/brand/success/violet/amber/teal/secondary/
   outline/ghost/soft/destructive) so action colours stay consistent.

**Rules for developers (and agents):**
- **Do not add new fonts.** Headings use `var(--font-display)`, everything else
  `var(--font-body)`/`var(--font-ui)`. Never hardcode a font name.
- **Do not introduce raw hex colours.** Use the CSS variables / Tailwind theme.
  If you genuinely need a new colour, add a token in `:root` first.
- **Do not hand-roll buttons/badges/dialogs.** Use the `components/ui` primitives.
  Need a new style? Add a variant to the primitive, don't fork it.
- **Match the surrounding spacing scale** (the app uses Tailwind's default scale;
  cards use `glass-card` / `glass-card-pad`). Don't eyeball new paddings.
- **Verify before you ship UI:** `npm run build` must pass, and check the page at
  **375px and 1280px** — the app is mobile-first (tables collapse to cards, 44px
  touch targets). A quick before/after screenshot catches drift instantly.

If you keep colours/spacing/fonts on tokens and controls on primitives, the UI
**cannot** look different from what's shipped here.

---

## 6. Webhooks the devs must wire (for live integrations)

| Provider | Point its webhook at | Secret env |
|---|---|---|
| Stripe (payments) | `POST /api/webhooks/stripe` | `STRIPE_WEBHOOK_SECRET` |
| Twilio (inbound SMS replies) | `POST /api/webhooks/twilio` | (Twilio signature) |
| Email (inbound replies) | `POST /api/webhooks/email` | `INBOUND_EMAIL_SECRET` |

**Note on inbound replies:** when a parent texts back the Twilio number (or
replies to an email), the webhook threads it into their support conversation
**and** logs it in **Admin → Communications** as an "inbound" entry — but only if
the webhook above is configured. Until then, replies go nowhere. See FEATURES.md
"Communications".

---

## 7. Status: what's done and what's pending

**Done & verified** (gate at handoff: `tsc` 0 · `eslint` 0 · `vitest` 16/16 ·
`next build` clean): the full platform — booking + checkout, all four portals +
HSHS, CRM, AI (Elliot, moderation, search, reports, digest, drafts, cost
governance + Batch API), tamper-evident audit trail + soft-delete/Trash, the
design system + mobile pass, branded email template, and the moderation Escalate→
Incident workflow.

**Pending / needs you (not code — config or product decisions):**
- **Keys**: add the production keys you want live (see §2 of [.env.example]).
- **Postgres** switch for production (DEV_NOTES.md).
- **Voyage** `VOYAGE_API_KEY` to upgrade search from local to true semantic
  embeddings (works without it).
- **Email content**: the branded *shell* exists (`lib/email-template.ts`); copy
  for each message is plain and can be refined.
- **Inbound webhooks** configured (see §6) for two-way SMS/email.
- **Legal**: a real Privacy Policy + Terms (the footer links are placeholders).
- See [DEV_NOTES.md](DEV_NOTES.md) for the remaining integration to-dos (Drive
  booklets, BNPL, Sentry) and credentials checklist.

---

## 8. Repository map (where things live)

```
app/                 # routes (App Router). app/(public marketing), /book,
                     # /login, /dashboard (parent), /student, /tutor, /admin, /partner
app/api/             # route handlers: checkout, webhooks/*, cron/*, upload
components/ui/        # the design-system primitives (Button, Badge, Card, Table, …)
components/portal/    # portal chrome (shells, navs, notification bell)
components/landing/   # marketing page sections
components/student|tutor|messaging|admin/   # feature components
lib/                 # all business logic (db, ai, moderation, email, billing, …)
prisma/schema.prisma # the data model (+ prisma/migrations/, prisma/seed.ts)
tests/               # vitest (pure-logic + integration against dev.db)
```
Business logic lives in `lib/*` and server actions; pages stay thin. Start at
`prisma/schema.prisma` for the data model and `lib/` for behaviour.
