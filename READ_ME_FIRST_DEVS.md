# Read me first (developers)

Welcome to the Everest Tutoring × Harrisdale SHS platform. This is the 60-second
orientation. The full detail is in **[HANDOFF.md](HANDOFF.md)**, **[AGENTS.md](AGENTS.md)**
(working rules) and **[FEATURES.md](FEATURES.md)** (what everything does) - read those next.

---

## Start here

- Read **HANDOFF.md** first, then **AGENTS.md** (rules) and **FEATURES.md** (what
  everything does). Don't skip them.
- It runs with **zero API keys**:
  ```bash
  npm install
  cp .env.example .env.local
  npx prisma migrate dev
  npx prisma db seed
  npm run dev            # http://localhost:3000
  ```
  Don't go hunting for missing keys - every integration (email, SMS, AI, Stripe)
  degrades to a safe **preview/stub mode** on purpose.

## The non-obvious gotchas (these cause "it's broken" panics)

- **This is Next.js 16, heavily modified** - APIs differ from older Next. There's
  a warning at the top of AGENTS.md; read the relevant guide in
  `node_modules/next/dist/docs/` before assuming behaviour.
- **After any Prisma migration, restart the dev server.** It otherwise serves a
  stale client and you'll see phantom errors that a restart fixes.
- **Demo logins use magic links printed to the dev console** - there are no
  passwords. Trigger sign-in at `/login`, then copy the `Magic sign-in link...`
  URL from the terminal. The login emails are listed in HANDOFF.md.
- **Don't commit `.env.local` or `dev.db`** - they're gitignored for a reason
  (secrets and local data).

## The design rule (the whole reason for this handoff)

The UI must ship looking exactly as it does now. A previous handoff came back with
the wrong fonts, spacing and colours - that must not happen again.

- Fonts are self-hosted (Montserrat headings / Inter body) and every colour,
  spacing and radius is a **CSS token** in `app/globals.css :root`. All
  buttons/badges/dialogs go through the `components/ui/` primitives.
- **Don't add new fonts, raw hex colours, or hand-rolled buttons.** Need a new
  style? Add a variant to the existing primitive or a token in `:root`.
- **Australian English, no em dashes** anywhere user-facing.
- Always run the green gate before pushing:
  ```bash
  npx tsc --noEmit && npx eslint . && npx vitest run && npm run build
  ```

> Keep colours/spacing/fonts on the tokens and controls on the primitives, and
> the UI cannot drift.

## Before going live (config and decisions, not bugs - see HANDOFF.md sections 4 & 7)

- Switch the DB from SQLite to **Postgres** (steps in DEV_NOTES.md).
- Add the **production keys** you want live (Stripe, Resend email, Anthropic, etc.).
- **Wire the webhooks** (Stripe + Twilio/email inbound) or two-way SMS/email
  replies won't flow in.
- **File uploads** currently write to `/public/uploads` (a dev stub) - swap to
  S3 / Vercel Blob for production (there's a `TODO(prod)` marking it).
- Add real **Privacy Policy + Terms** (footer links are placeholders).

---

That's everything genuinely non-obvious. The rest is self-explanatory once you've
read HANDOFF.md.
