# Everest Tutoring × HSHS — Booking Platform

A full-stack tutoring enrolment and CRM platform built for the Everest Tutoring × Harrisdale Senior High School afterschool program.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 |
| Database | SQLite (dev) → PostgreSQL (prod) via Prisma 7 |
| Payments | Stripe Checkout |
| Email | Resend |
| SMS | Twilio |
| ORM | Prisma 7 + better-sqlite3 adapter |

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Resend (email)
RESEND_API_KEY="re_..."
EMAIL_FROM="Everest Tutoring <noreply@everesttutoring.com.au>"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+61412345678"

# App
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Database setup

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

This creates `dev.db` and seeds:
- Term 3 2026 (Jul 20 – Sep 25)
- All 9 class subjects across Years 8, 9, 10
- An admin user (`admin@everesttutoring.com.au`)

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Stripe Webhook Setup (Local)

Install the Stripe CLI and forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` secret printed by the CLI into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

The webhook handler (`app/api/webhooks/stripe/route.ts`) listens for `checkout.session.completed` and:
1. Creates `User`, `Student`, `Enrollment`, and `Booking` records
2. Sends a confirmation email via Resend
3. Sends a confirmation SMS via Twilio

---

## Gotham Font

The design uses Gotham (licensed font). To enable it:

1. Obtain Gotham OTF/WOFF2 files (through your Hoefler&Co licence or similar)
2. Place them in `public/fonts/`:
   - `Gotham-Book.woff2`
   - `Gotham-Medium.woff2`
   - `Gotham-Bold.woff2`
3. Uncomment the `@font-face` blocks in `app/globals.css`

Until then, Montserrat (Google Fonts) is used as the fallback — the design still looks great.

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page with hero, schedule, pricing, CTA |
| `/book` | Multi-step booking funnel (4 steps) |
| `/confirmation/[id]` | Post-payment confirmation page |
| `/dashboard` | Parent dashboard — upcoming classes, booking summary |
| `/dashboard/makeup` | Request a make-up class |
| `/admin` | Admin CRM overview — stats, capacity, recent bookings |
| `/admin/bookings` | Full bookings table with filters |
| `/admin/students` | All enrolled students |
| `/admin/classes` | Class capacity grid by subject |
| `/tutor` | Tutor view — today's roster + weekly schedule |
| `/api/checkout` | POST → creates Stripe Checkout session |
| `/api/webhooks/stripe` | Stripe webhook receiver |

---

## Pricing & Proration

Fees are prorated from the **next Monday after booking** to the end of term (Jul 5, 2026).

| Subjects | Weekly rate |
|---|---|
| 1 | $35/wk |
| 2 | $60/wk |
| 3 | $80/wk |

10% sibling discount applied to the 2nd and each subsequent student.

Proration logic lives in `lib/proration.ts`.

---

## Production Deployment (Vercel + PostgreSQL)

### 1. Provision a Postgres database

Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com).

### 2. Update Prisma schema

In `prisma/schema.prisma`, change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"
}
```

In `lib/db.ts`, swap the adapter:

```ts
import { PrismaPostgres } from '@prisma/adapter-pg'
// replace PrismaBetterSqlite3 with PrismaPostgres
const adapter = new PrismaPostgres({ connectionString: DB_URL })
```

Install the new adapter: `npm install @prisma/adapter-pg pg`

### 3. Run migrations against production DB

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed
```

### 4. Set environment variables in Vercel

Add all variables from `.env.local` to your Vercel project settings, updating:
- `DATABASE_URL` → your production Postgres connection string
- `NEXT_PUBLIC_BASE_URL` → your production domain (e.g. `https://booking.everesttutoring.com.au`)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` → live Stripe keys

### 5. Configure Stripe webhook

In the [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel.

### 6. Deploy

```bash
git push
```

Vercel auto-deploys on push to `main`.

---

## Term Dates

Update `lib/proration.ts` at the start of each new term:

```ts
export const TERM_START = new Date('2026-04-20')
export const TERM_END   = new Date('2026-07-06') // exclusive (Jul 5 inclusive)
export const TOTAL_TERM_WEEKS = 11
```

Also update the seed data in `prisma/seed.ts` and re-seed the database.
