# Portal UI visual language — building new dashboards

A practical reference for adding **new dashboards inside the portals** while keeping the
**exact same styling and colour**. Companion to [DESIGN.md](DESIGN.md) (full spec). The
living source of truth is always the code: `app/globals.css :root` (tokens),
`app/globals.css` (`.portal-*`, `.glass-*`), `components/portal/*`, `components/ui/*`.
**If this doc and the code ever disagree, the code wins.**

> The #1 rule: do not let the UI drift. Reuse the tokens, classes and primitives below.
> Never hardcode a colour, font, or bespoke component.

---

## 1. The portal visual register

Portals use a **frosted-glass over a warm ivory splash** aesthetic: a soft brand-tinted
background, translucent blurred "glass" cards floating on it, cool-navy ink text, and one
bright brand blue as the primary accent. It should read calm, professional and airy - not
dense. (The public marketing site is a separate register; dashboards live in this portal one.)

**Structure of every signed-in surface** (`components/portal/PortalShell.tsx`):
```
<div className="portal splash-bg">        // warm ivory splash background
  <header className="portal-header"> …     // glassy sticky header: logo, eyebrow/sub, user, sign-out
  <main className="portal-main">           // max-width 1100px, centered, responsive padding
    {your dashboard}
```
Wrap any new dashboard in the existing shell - `PortalShell` (parent/generic),
`AdminShell` + `AdminNav` (admin), or `StudentShell` + `StudentNav` (student). Don't build
new chrome; reuse these so header, background, nav and spacing stay identical.

## 2. Colour tokens (never use raw hex — reference these)

All defined in `app/globals.css :root`.

- **Brand blue (primary accent):** `--brand-500 #009DFF` (scale `--brand-50…900`);
  hover/darker `--brand-600 #007ECC`. Primary buttons, active states, links, focus ring
  (`--ring`), key numbers.
- **Navy (deep brand):** `--navy-500 #00203F` (scale 50…900). Header/dark surfaces, strong
  headings, the gradient pair with brand blue.
- **Ink (cool neutral text + borders):** `--ink-800 #182030` (primary text `--fg1`),
  `--ink-600` (`--fg2`, body), `--ink-500` (`--fg3`, muted), `--ink-400` (`--fg4`, faint);
  borders `--border-subtle` (ink-200) / `--border-default` (ink-300); hairlines
  `--hairline` / `--hairline-soft`.
- **Surfaces:** page `--bg-page` (ivory `#FFF8F2`), card `--bg-surface #FFFFFF`; glass
  `--glass-bg rgba(255,255,255,.55)` / `--glass-bg-strong .72`, `--glass-border`.
- **Semantic (use for status only, not decoration):** success `--success-500 #22A05B`,
  warn `--warn-500 #F5A623`, danger `--danger-500 #E04141` (each also has `-50` / `-700`).
- **Accent palette for card icons / page splashes (RGB triples):** `--accent-blue`,
  `--accent-violet`, `--accent-teal`, `--accent-coral`, `--accent-amber`. Use e.g.
  `rgb(var(--accent-violet))` or `rgba(var(--accent-violet), .12)` for a tinted icon chip.
- **HSHS partner colours:** `--hshs-navy #0F2A4F`, `--hshs-blue #1E5DB5` (school portal only).
- Tailwind mirrors these as utilities: `text-fg1..4`, `bg-page`, `bg-sunken`,
  `border-subtle`, `text-primary`, `bg-dark`, etc. (see the `@theme` block).

## 3. Type, shape, shadow, motion

- **Fonts (self-hosted, tokenised):** headings `var(--font-display)` = **Montserrat**;
  body/UI `var(--font-body)` / `var(--font-ui)` = **Inter**; mono `var(--font-mono)`.
  Never hardcode a font name.
- **Radius:** base `--radius 0.75rem`; glass cards use `20px`, glass stat chips `18px`.
- **Shadows:** `--shadow-xs…xl` + brand glow `--sh-brand`. Glass cards carry their own
  layered shadow (see `.glass-card`).
- **Motion:** `--ease-standard`, `--ease-out`, `--ease-spring`; interactive glass cards
  lift `translateY(-2px)` on hover. Honour `prefers-reduced-motion`.
- **Layout:** container `--container 1240px`; portal main is `max-width:1100px`, centered,
  padding `clamp(20px,4vw,36px)`.

## 4. Ready-made classes to compose a dashboard (use verbatim)

Defined in `app/globals.css` (portal section, ~lines 2571–2679):

- **`.portal-title`** — page H1 (Montserrat 800, clamp 22–28px, tight tracking, ink-800).
- **`.portal-lede`** — one-line subtitle under the title (Inter 14.5px, ink-600).
- **`.portal-section-title`** — section heading (Montserrat 800, 16px).
- **`.glass-card` + `.glass-card-pad`** — the frosted content panel. Add `.is-interactive`
  (or use an `<a>`) for the hover-lift. The primary building block.
- **`.glass-stat`** with **`.glass-stat-label`** (uppercase 11.5px caption) +
  **`.glass-stat-value`** (Montserrat 800, clamp 24–30px) — the KPI/metric chip. A row of
  these is the top of a dashboard.
- **`.splash-bg`** — the tinted background wrapper (already applied by the shells).

**A new KPI dashboard is essentially:** shell → `.portal-title` + `.portal-lede` → a
responsive grid of `.glass-stat` chips → sections of `.glass-card .glass-card-pad`
containing tables / charts / lists.

## 5. Controls & data — go through the primitives (don't hand-roll)

`components/ui/`: **Button** (variants: default/brand/success/violet/amber/teal/secondary/
outline/ghost/soft/destructive), **Badge**, **Card**/**EmptyState**, **Table** (collapses to
cards below `sm`), **Tabs**, **Dialog**, **Tooltip**, **Toaster**. Charts already exist
(attendance line graphs, analytics) — reuse those patterns for new charts rather than
introducing a new charting approach. **Use colour only to carry meaning** (status, category),
never as decoration — this keeps dashboards calm and legible.

## 6. Reference screens to copy patterns from

- `app/admin/analytics/page.tsx`, `app/admin/page.tsx` — admin KPI + card layouts.
- `app/student/page.tsx` — student home: stat chips + "latest X" glass-card sections.
- `components/portal/AdminShell.tsx` / `AdminNav.tsx`, `StudentShell.tsx` / `StudentNav.tsx`
  — how a portal wires nav + shell; mirror this for any new dashboard route.

## 7. Rules + verify gate

- **Australian English, no em dashes** anywhere user-facing.
- No new fonts, **no raw hex** (add a token first if truly needed), no bespoke buttons/cards
  (extend a primitive/variant).
- Mobile-first: verify at **375px and 1280px**; 44px touch targets; tables → cards below `sm`.
- Data lives in `lib/*` + `prisma/schema.prisma`; pages stay thin.
- Run: `npm run dev` → `localhost:3000` (zero keys, preview/stub mode). Restart the dev
  server after any Prisma migration (it otherwise serves a stale client).
- **Green gate before commit:** `npx tsc --noEmit && npx eslint . && npx vitest run && npm run build`.
  A before/after screenshot at both widths is the fastest drift check.
