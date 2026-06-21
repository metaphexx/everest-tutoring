# Dev hand-off notes

Things deliberately scaffolded for the dev team to wire to real infrastructure.
Everything below runs in a safe stub today so the product is fully demoable; flip
each on by adding credentials and replacing the marked branch.

## 1. Google Drive booklets ("what to print this week")

File: `lib/materials.ts` (full notes in the header comment).

- Booklets/materials live on Google Drive. The tutor "Print this week" suggestions
  currently come from a scaffold; `suggestMaterials()` should read the real Drive.
- Set up a **service account**, enable the Drive API, share the booklets folder
  (read-only) with the service account email.
- Env vars (already checked by `hasDrive`):
  - `GOOGLE_DRIVE_CLIENT_EMAIL`
  - `GOOGLE_DRIVE_PRIVATE_KEY`
  - `GOOGLE_DRIVE_BOOKLETS_FOLDER_ID`
- `npm i googleapis`; build a JWT client with scope `drive.readonly`.
- Suggested folder convention: `Booklets/<Year>/<Subject>/<Topic or Week>.pdf`.
- Match candidate files to the week's topic by folder path + filename similarity,
  or pass the candidate filenames + topic to `lib/ai.ts` and let the model pick.
- Return `webViewLink` (open) and `webContentLink` (download/print) per file.
- Keep the `MaterialSuggestion` shape stable so the tutor UI needs no changes.

## 2. Course outline file upload + parsing

Files: `app/partner/PartnerSubmit.tsx` (upload UI), `lib/outline.ts` (scan).

- HSHS uploads an outline per year+subject. Today: text files (`.txt/.md/.csv`)
  are read in-browser into the text box; PDF/DOCX uploaders paste the text or add
  a Drive link. The AI scan + assessment/topic extraction is fully functional on
  whatever text is provided.
- To accept binary uploads directly:
  - Add object storage (S3 / Vercel Blob / Drive) for the original file; store the
    URL in `CourseOutline.sourceUrl`.
  - Extract text server-side before `scanCourseOutline()`: `pdf-parse` (or
    `pdfjs-dist`) for PDF, `mammoth` for DOCX. Feed the extracted text in as
    `rawText`.
- The AI extraction (`scanCourseOutline`) is provider-swappable via `lib/ai.ts`
  (uses task `analytics`); no prompt changes needed to switch models.

## 3. Postgres for production

Dev runs on SQLite (`file:./dev.db`); production should run on Postgres.

1. `npm i @prisma/adapter-pg pg`
2. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
3. In `lib/db.ts`, replace the `isPostgres` guard with a `PrismaPg` adapter:
   `const adapter = new PrismaPg({ connectionString: DB_URL })`.
4. Reset migrations for the new provider (SQLite migration SQL is not
   Postgres-compatible): delete `prisma/migrations`, then
   `npx prisma migrate dev --name init` against the Postgres `DATABASE_URL`.
5. Set `DATABASE_URL="postgres://..."` (e.g. Neon / Supabase / RDS).

`lib/db.ts` already detects a `postgres://` URL and throws a clear error until
the adapter is wired, so you can't accidentally run Postgres on the SQLite driver.

**Capacity enforcement on Postgres:** `lib/enroll.ts` `seatOrWaitlist` counts
active enrollments and seats-or-waitlists inside a `$transaction`. SQLite
serialises writes so this can't overbook in dev. Postgres uses read-committed by
default, so two concurrent checkouts for the last seat could both read N and
both insert. Before going live on Postgres, lock the class row first inside the
transaction — `SELECT id FROM "Subject" WHERE id = $1 FOR UPDATE` via
`tx.$queryRaw` — so the second txn blocks until the first commits.

## 4. Error monitoring (Sentry)

`lib/log.ts` logs structured lines always and forwards exceptions to Sentry when
configured. To enable:

1. `npm i @sentry/node`, set `SENTRY_DSN`.
2. Add `instrumentation.ts` at the project root that calls `Sentry.init({ dsn })`.
3. `captureError()` (already used in the Stripe webhook) then reports
   automatically. Add it to other critical catch blocks as needed.

## 5. Inbound replies (Elliot outreach follow-ups)

Outreach goes OUT via Resend (email) and Twilio (SMS). Replies come back in via
two webhooks that thread the reply into the parent's support conversation and
alert the admin (`lib/inbound.ts`):

- **SMS:** in the Twilio console, set your number's "A message comes in" webhook
  to `POST https://<domain>/api/webhooks/twilio`. A parent texting your Twilio
  number lands there. (Validate `X-Twilio-Signature` in prod.)
- **Email:** replies land in whatever inbox `FROM_EMAIL` points to. Route them in
  with one of: Gmail filter -> Apps Script that POSTs to `/api/webhooks/email`;
  Resend Inbound; or SendGrid Inbound Parse. Protect with `INBOUND_EMAIL_SECRET`.

So yes: email replies arrive in the Gmail/inbox behind `FROM_EMAIL`, and SMS
replies arrive on the Twilio number you send from - both get pulled into the CRM
once the webhooks above are pointed at the app.

## 6. Credentials still needed to go fully live

| Capability        | Env vars                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Email (Resend)    | `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME`                          |
| SMS (Twilio)      | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`     |
| AI (Claude)       | `ANTHROPIC_API_KEY` (+ optional `AI_MODEL*` overrides)              |
| Payments (Stripe) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, publishable key        |
| Invoicing (Xero)  | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, account/tax codes            |
| Booklets (Drive)  | `GOOGLE_DRIVE_CLIENT_EMAIL`, `_PRIVATE_KEY`, `_BOOKLETS_FOLDER_ID`   |

All of the above degrade gracefully: with placeholders, the related feature runs
in preview/stub mode and logs what it *would* do, so nothing breaks pre-launch.

## 7. BNPL / instalments (Afterpay, Zip) at checkout

`/api/checkout` and the waitlist-claim checkout omit `payment_method_types`, so Stripe Checkout automatically offers every method enabled in the Stripe Dashboard. To let families pay in instalments:

1. In the Stripe Dashboard → Settings → Payment methods, enable **Afterpay/Clearpay** and/or **Zip** (AUD, AU).
2. Nothing to change in code — they appear on the hosted checkout once enabled (Afterpay caps apply, ~A$2,000/transaction; Stripe just hides it for out-of-range amounts).
3. Everest is paid in full upfront; the BNPL provider carries the instalment risk.

True monthly **subscriptions** (recurring charge each month) are a separate, larger build (recurring Price + `mode: 'subscription'` + subscription-schedule + invoice.paid webhooks) — not done; BNPL covers the "pay over time" need for now.

## 8. Account credit (missed sessions)

`lib/credits.ts` — admin issues credit on a student (`/admin/students/[id]` → Account credit panel; default $35 = one session). Stored as `StudentCredit` (remaining `amountCents`, decremented as consumed). Auto-applied at the family level: re-enrolment auto-charge (consumed at live charge; previewed in the reminder) and new bookings (`/api/checkout` reduces the Stripe amount, consumed in the webhook on success). Balance shown on the parent dashboard + student profile. Policy: discretionary (admin chooses to issue), consistent with no-refunds.
