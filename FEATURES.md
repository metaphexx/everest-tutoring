# Everest Tutoring × HSHS — Feature Reference

Every feature in the system and how it works, with the key files. Pages are thin;
the real logic is in `lib/*` and server actions. Roles are routed by
`User.role` ∈ {parent, student, tutor, admin, school}; **admin passes every role
check**. Auth gate is `requireUser([roles])` in `lib/session.ts`.

---

## 1. Public marketing site (`app/page.tsx`, `components/landing/*`)
- Hero, subjects, **live timetable** (real seat counts from the DB), curriculum,
  "Supporting HSHS", testimonials, FAQ, footer. Mobile-first, SEO metadata +
  JSON-LD (`app/layout.tsx`), sitemap/robots, OpenGraph image.
- `/curriculum` and `/supporting-hshs` are dedicated marketing pages with the
  brand blue-highlight headline treatment.
- The header/footer **"Sign in"** button → `/login` (one login for all roles).

## 2. Booking + checkout (`app/book/*`, `app/api/checkout`, `app/api/webhooks/stripe`)
- 5-step flow: year level → subjects → class times → student details → pay.
- **Student email is required and must differ from the parent email** and be
  unique across siblings (validated client + server). Phone optional.
- Pricing is **prorated** by weeks remaining in the term (`lib/proration.ts`):
  $35/wk for 1 subject, $60 for 2, $80 for 3.
- Pays via **Stripe Checkout**; the `stripe` webhook creates the booking,
  students, enrolments (seating or waitlisting via `lib/enroll.ts` so a full
  class never overbooks), sends the branded confirmation email, and (if Xero is
  configured) raises an invoice.
- Abandoned-cart capture: incomplete checkouts are swept and can be nudged
  (`lib/abandoned.ts`).

## 3. Auth & roles (`auth.ts`, `lib/session.ts`)
- **NextAuth magic-link** (Resend provider). No passwords. In dev the link is
  printed to the server console (`🔑 Magic sign-in link…`); in prod it's emailed.
- `requireUser(roles)` redirects signed-out → `/login`, wrong-role → `/account`,
  suspended accounts → `/suspended` (checked against the DB so a suspension is
  immediate). It also stamps the **audit actor** (who + IP + device) for the
  request and records the device for new-device alerts.
- `homeForRole()` routes each role to its area after sign-in.

## 4. Parent portal (`app/dashboard/*`)
- Children, their classes, attendance %, upcoming **assessment tracker**, reports
  (once published), account credit, and **value views** (what they've received).
- **Quick actions** (uses the `Dialog` primitive): message the team, enrol another
  student, make-up/reschedule/cancel, and **next-term auto-enrolment** toggle with
  a friction ladder (it's a retention lever; never a refund — per the no-refund
  policy, cancellations become credit/withdrawal).
- **Make-up sessions** (`lib/makeup.ts`): report a missed class, book a make-up.
- **Service requests** (`lib/*requests`): change times, pause a term, update
  details — submitted to admin, never auto-refunded.
- **Messaging** with the tutor/admin (see §9), with the safety disclaimer that
  messages are monitored and visible to the parent.
- **Waitlist**: join when a class is full; auto-offered a seat when one frees up.

## 5. Student Learning Hub (`app/student/*`, `components/student/*`)
- Separate **student login** (own account, linked to the Student record; invited
  by magic-link at enrolment — `lib/student-invite.ts`).
- **Ask composer** (the centrepiece): "What are you stuck on?" — pick a class,
  choose *Share with class* (default) or *Just my tutor*, attach a school
  material or photo, and post. Questions run through AI moderation first.
- **Classrooms** (one per enrolled subject): a Google-Classroom-style stream —
  tutors post announcements/resources; class questions appear for peers to see and
  reply; "I have this too" reactions; tutor replies can be pinned/marked helpful.
- **School Materials**: upload course outlines + worksheets; the platform reuses
  the AI-extracted official HSHS assessment dates to build a per-student
  **Assessment Tracker** (zero per-student AI cost — `lib/school-materials.ts`).
- **Messages** with the tutor (monitored; same moderation pipeline).
- **Resources** shelf, settings.

## 6. Tutor portal (`app/tutor/*`, `components/tutor/*`)
- **Attendance**: mark-all-present + per-student; **run-sheet** print view.
- **Classrooms** (plugs into the student Learning Hub): post announcements +
  resources, answer the class's questions (with an AI "suggest answer" draft to
  edit), pin/mark-helpful.
- **Questions** inbox, **Resources** upload, **Outlines** (view HSHS course-outline
  PDFs), **Reports** authoring (with an "Elliot draft" first pass), **Messages**.
- **Teaching plan** card: suggested topic/prac/booklets per class, aligned to the
  HSHS outline and the upcoming assessment.

## 7. Admin CRM (`app/admin/*`)
The operations hub. Sections (left nav):
- **Overview**: stat cards, the **proactive Morning brief** (AI digest of the
  day's signals — `lib/digest.ts`), and an **Elliot** snapshot.
- **Analytics**: bookings, attendance line graph, revenue, re-enrolment stats.
- **Students / Classes / Bookings / Carts / Requests / Waitlist / Terms / Alumni**:
  full CRM management. Each student detail page has notes, credits, reports, and a
  **Change history** timeline.
- **Questions / Moderation / Materials / Resources**: the student-hub admin side
  (see §9 for moderation).
- **Retention**: at-risk families ranked by **churn signals** (pure SQL —
  `lib/retention-score.ts`) with an AI "draft win-back" note.
- **Reports**: review tutor/auto-drafted term reports and publish to parents;
  **Auto-draft term reports** button (see §8).
- **Messages**: the support inbox + monitored chats (see §9).
- **Communications**: every outbound + inbound message (see §12).
- **Incidents**: safeguarding/behaviour/injury log (now fed by moderation Escalate).
- **Activity** (audit log) + **Trash** + **Sign-in activity** (see §11).
- **AI usage**: per-task spend + budgets (see §8).
- **Elliot**: the AI assistant chat (see §8). A global "Ask Elliot" command bar
  sits on every admin page.
- **Search**: fast lexical lookup **plus** "Related by meaning" semantic search.
- **HSHS (partner)**: admin view of the school portal + referral outreach.

## 8. AI ("Elliot") and cost governance (`lib/ai.ts`, `lib/elliot.ts`, `lib/ai-*`)
- **Model routing** (`lib/ai.ts`): each task has a cost-optimised default model
  (moderation/summary/draft → Haiku, support/analytics/report → Sonnet, Elliot →
  Opus). Swappable per task via env; **prompts never change when the model does**.
  Everything has a deterministic fallback, so **no API key = no cost, still works**.
- **Elliot**: grounded entirely in live CRM data. Answers questions, and can
  **draft** emails/SMS/reports and **propose actions** (a broadcast, or "make a
  note on Emma that…") that the admin confirms — it never sends/writes without
  confirmation, and confirmed actions are audited.
- **Moderation** (`lib/moderation.ts`): screens every message/question/reply for
  abuse, tutor-poaching, and safeguarding (see §9).
- **Churn scoring + win-back**, **tutor answer-assist**, **support triage**,
  **real assessment extraction**, **morning digest** — all signals-in-SQL, AI only
  drafts.
- **Semantic search** (`lib/embeddings.ts`, `lib/search.ts`): pluggable embeddings
  — **Voyage** when `VOYAGE_API_KEY` is set, a deterministic local hash embedding
  otherwise. Indexes students/questions/notes/resources/classes; cosine ranking.
- **Cost governance**: a **content-hash cache** (`lib/ai-cache.ts`) reuses
  identical answers; a **usage ledger + per-task monthly budgets**
  (`lib/ai-cost.ts`) shown at **Admin → AI usage**; over budget → deterministic
  fallback. The **nightly Batch API** path (`lib/ai-batch.ts`) drafts term reports
  at ~50% cost (submit one tick, collect on a later tick; `AiBatch` model tracks it).

## 9. Messaging + AI moderation (`app/messages/*`, `lib/moderation.ts`, `app/admin/moderation/*`)
- Parent↔tutor, parent↔admin (support), and student↔tutor chats reuse one
  `Conversation`/`Message` model + the `Composer`/`MessagesView` components.
  Image uploads supported (e.g. a tutor sharing working-out).
- **Every message is AI-screened before delivery.** Foul language is withheld at
  any severity; high-severity **tutor poaching/abuse auto-suspends the tutor** and
  withholds the message (kept as admin evidence); safeguarding flags are never
  hidden. Conversations are visible to the parent and monitored by admin (stated in
  a disclaimer on the student/tutor views).
- **Admin → Moderation** queue, three actions (`app/admin/moderation/actions.ts`):
  - **Approve** — safe; unblocks + clears the flag (becomes visible).
  - **Resolve** — acknowledged; dismiss from the queue. **A withheld message stays
    withheld.** No outward effect.
  - **Escalate** — **opens a safeguarding/behaviour Incident** (`/admin/incidents`),
    maps the AI flag category→incident type/severity, **emails the safeguarding
    lead** when `SAFEGUARDING_LEAD_EMAIL` is set, plus an in-CRM notification.
  - **Report to parent** (separate) — emails the parent that a message in their
    child's chat was withheld (the only action that contacts a parent here).

## 10. HSHS partner portal (`app/partner/*`)
- Read-only school view: participation by year, on-campus-today, weekly timetable,
  attendance — **no academic grades or financial details** (duty-of-care scope).
- The school can submit **assessment dates, referrals, notices, and course
  outlines**; outlines are AI-scanned to extract assessment dates shared with
  tutors + students. Referrals get an Elliot-drafted outreach the admin approves.

## 11. Audit trail, soft-delete & security (`lib/db.ts`, `lib/audit-*`, `app/admin/audit`, `app/admin/trash`)
- **Tamper-evident audit log**: every create/update/delete on 16 business models is
  logged automatically (Prisma `$extends` + `AsyncLocalStorage` actor) with a
  before/after snapshot and a **SHA-256 hash chain** — editing or deleting history
  breaks the chain, which the Activity page's verify banner detects. One-click
  **Undo** restores the prior value.
- **Soft-delete + Trash**: deletes on 6 heavy models become a recoverable
  `deletedAt` stamp (cascades a student's notes/credits); `/admin/trash` restores
  them. `rawPrisma` bypasses the filter where needed.
- **Sign-in provenance**: IP + device captured per change; **new-device sign-in
  alerts**; a "Sign-in activity" panel on the audit page.

## 12. Communications: email & SMS (`lib/resend.ts`, `lib/notify.ts`, `lib/comms.ts`, `lib/inbound.ts`)
- **Outbound email** goes through **one branded template** (`lib/email-template.ts`
  → navy/blue gradient header, content card, footer) via `sendEmail`, so every
  message (reminders, win-backs, waitlist offers, class changes, moderation
  notices) looks identical. Booking confirmation has its own rich template.
- **SMS** via Twilio. Both email + SMS log to the `Notification` table and appear
  in **Admin → Communications**. Without keys they run in **preview mode** (logged,
  not sent) — clearly labelled there.
- **Inbound replies** (`lib/inbound.ts`): when a parent **texts back the Twilio
  number** or replies to an email, the webhook (`/api/webhooks/twilio` or
  `/api/webhooks/email`) (a) honours STOP/START opt-out, (b) threads the reply into
  their support conversation, (c) **classifies the intent** (reschedule/billing/
  complaint/…) for the admin notification, and (d) logs it in **Communications** as
  a green "inbound" entry. **This requires the webhook to be configured** (see
  HANDOFF §6) — until then, replies aren't captured.
- **Broadcasts** (`lib/broadcast.ts`): admin/Elliot send to an audience
  (all/by year), respecting opt-outs.

## 13. Billing & accounting (`lib/stripe.ts`, `lib/xero.ts`, `lib/credits.ts`, `lib/proration.ts`)
- Stripe Checkout + webhook for payments. **Account credit** (e.g. missed session)
  applies at the family level to reduce the next charge — never a cash refund.
- **Xero** invoicing (optional): the webhook raises an invoice per booking; runs in
  preview mode without credentials.

## 14. Scheduled jobs (`app/api/cron/*`, secured by `CRON_SECRET`)
- `reminders` — class reminders. `nudges` — proactive nudges + waitlist/makeup/cart
  sweeps + re-enrolment lapse. `reenrolment` — next-term auto-enrolment.
- `nightly` — rebuild the search index, draft any missing term reports, refresh the
  morning brief, and collect any ready AI batches. `?transport=batch` submits
  reports via the cheaper Batch API.

## 15. Integrations summary
| Integration | Used for | Without its key |
|---|---|---|
| Stripe | checkout, payments | checkout composes but can't charge |
| Resend | outbound email | emails logged in preview mode |
| Twilio | outbound + inbound SMS | SMS logged in preview mode |
| Anthropic | all AI features | deterministic fallbacks (free) |
| Voyage | semantic search embeddings | local hash embedding |
| Xero | invoicing | invoices composed, not pushed |
| Google Drive | tutor "what to print" booklets | scaffold mode |
| Meta Pixel/CAPI | ad tracking | tracking disabled |
| Sentry | error monitoring | console logging only |
