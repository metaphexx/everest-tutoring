---
name: Everest Tutoring × HSHS
description: Premium afterschool tutoring platform for Harrisdale Senior High School — Years 8, 9 and 10.
colors:
  sky-blue: "#009dff"
  sky-blue-deep: "#007acc"
  electric-cyan: "#00FFFF"
  midnight-navy: "#00203F"
  midnight-navy-soft: "#0a2d54"
  surface-blue: "#f0f7ff"
  border-blue: "#e2eaf4"
  muted-slate: "#64748b"
  white: "#ffffff"
  year-8-violet: "#7C3AED"
  year-8-violet-bg: "#faf5ff"
  year-8-violet-border: "#ede9fe"
  year-9-rose: "#EC4899"
  year-9-rose-bg: "#fdf2f8"
  year-9-rose-border: "#fce7f3"
  year-10-emerald: "#22C55E"
  year-10-emerald-bg: "#f0fdf4"
  year-10-emerald-border: "#dcfce7"
typography:
  display:
    fontFamily: "Gotham, Montserrat, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Gotham, Montserrat, system-ui, sans-serif"
    fontWeight: 700
    fontSize: "clamp(2rem, 5vw, 3rem)"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Gotham, Montserrat, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "1.125rem"
    lineHeight: 1.3
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "0.75rem"
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.sky-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.sky-blue-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.8)"
    rounded: "{rounded.full}"
    padding: "16px 32px"
  button-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.1)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.sky-blue}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  card-default:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-year-8:
    backgroundColor: "{colors.year-8-violet-bg}"
    textColor: "{colors.year-8-violet}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-year-9:
    backgroundColor: "{colors.year-9-rose-bg}"
    textColor: "{colors.year-9-rose}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-year-10:
    backgroundColor: "{colors.year-10-emerald-bg}"
    textColor: "{colors.year-10-emerald}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.midnight-navy}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Everest Tutoring × HSHS

## 1. Overview

**Creative North Star: "The Ascent"**

The Ascent is the metaphor behind the Everest Tutoring platform. Not a summit reached — a climb in progress. Measured, deliberate, and grounded in substance. Every screen should feel like a step forward: clear of obstacles, confident of direction, quality visible in the craft.

This is not a platform that shouts or decorates. It earns trust through clarity. It lets the product speak and holds space for that to happen. The aesthetic is calm, quietly premium, and deeply functional — the kind of interface that feels right on a parent's phone at 9pm and equally at home printed on a school noticeboard. It is professional without being sterile, modern without being soulless.

The palette pairs a confident sky-blue primary with a grounding midnight-navy base, cut through by rare electric-cyan moments that signal energy and arrival. Three year-level identity colors — violet for Year 8, rose for Year 9, emerald for Year 10 — bring warmth and chromatic character into the booking flow without overwhelming the base system.

**Key Characteristics:**
- Type-led hierarchy. Gotham (fallback: Montserrat) carries all visual authority. Decorative elements earn their place or don't appear.
- Flat to lifted. Surfaces rest at ambient shadow; they lift on interaction. Depth is a reward, not a default.
- Rounded everywhere. Every container, button, and badge uses the rounded vocabulary. Nothing is sharp.
- Year-level chromatics. The violet/rose/emerald trio exists only within year-specific contexts. Never use them as general UI color.
- The palette is restrained-to-committed. Sky Blue leads, Electric Cyan arrives rarely. Never drenched.

## 2. Colors: The Summit Palette

A primary pair of sky and navy anchored in confidence, with three chromatic year-level identities and a near-invisible tinted neutral layer.

### Primary
- **Sky Blue** (`#009dff`): The main action color. CTAs, links, focus rings, active states, progress indicators. Carries 15–20% of any brand surface. Never more.
- **Sky Blue Deep** (`#007acc`): The hover/pressed state of Sky Blue. Used as the gradient endpoint on primary buttons and the dark half of the CTA gradient. Never used standalone.
- **Electric Cyan** (`#00FFFF`): The high-energy accent. Reserved for hero gradient endings, logo wordmark on dark backgrounds, and rare moments of arrival. Used at ≤5% of any surface. Its scarcity is what makes it land.

### Secondary (Year-level Identity)
- **Year 8 Violet** (`#7C3AED`): All Year 8 touchpoints — cards, tags, subject indicators, pricing tier. Never used outside year-specific contexts.
- **Year 9 Rose** (`#EC4899`): All Year 9 touchpoints. Same rule.
- **Year 10 Emerald** (`#22C55E`): All Year 10 touchpoints. Same rule.

### Neutral
- **Midnight Navy** (`#00203F`): Primary text color, dark hero background, admin sidebar. The anchor of the whole system.
- **Midnight Navy Soft** (`#0a2d54`): Secondary dark surface — hero gradient midpoint, hover states on dark surfaces.
- **Surface Blue** (`#f0f7ff`): Page background tint. Light enough to read as near-white, blue enough to feel on-brand.
- **Border Blue** (`#e2eaf4`): Card borders, dividers, table separators. Never darker than this inside white containers.
- **Muted Slate** (`#64748b`): Supporting text — captions, labels, secondary copy. Never used for primary content.
- **White** (`#ffffff`): Card surfaces, form fields, modal backgrounds.

### Named Rules
**The Electric Cyan Rule.** Electric Cyan appears in ≤2 places per screen and never on a white background. It exists for contrast against dark navy. On white, use Sky Blue instead.

**The Year Color Rule.** Violet, Rose, and Emerald are identity colors for Years 8, 9, and 10 respectively. They never appear as generic UI color (not for success states, not for arbitrary accents). Keep them year-bound.

## 3. Typography

**Display Font:** Gotham (with Montserrat, system-ui, sans-serif fallback)
**Body Font:** Montserrat (system-ui, sans-serif fallback)

**Character:** Gotham's geometric structure gives authority without coldness. Montserrat echoes its warmth at body size. Together they read as modern-institutional — the tone of a confident school prefect rather than a startup landing page.

### Hierarchy
- **Display** (700 weight, clamp(3rem, 7vw, 4.5rem), line-height 1.05, letter-spacing -0.025em): Hero headlines only. One per page. Where the brand identity lands first.
- **Headline** (700 weight, clamp(2rem, 5vw, 3rem), line-height 1.2, letter-spacing -0.02em): Section headers on the landing page, booking step titles. Dominant but not singular.
- **Title** (600 weight, 1.125rem, line-height 1.3): Card headings, sidebar section labels, form group labels. The workhorse of the product register.
- **Body** (400 weight, 1rem, line-height 1.6): All running copy. Max 65–75ch line length. Never below 1rem for reading text.
- **Label** (600 weight, 0.75rem, letter-spacing 0.05em, uppercase): Status chips, table column headers, badge text, section eyebrows.

### Named Rules
**The Weight Gap Rule.** Headings and body must never be within one weight step of each other on the same screen. If body is 400, headings are 700. No 500/600 halfway moves on display text.

**The Tracking Inversion Rule.** Headings track inward (letter-spacing negative). Labels track outward (letter-spacing positive). Body sits at normal. The inversion is deliberate and consistent — never apply outward tracking to a heading.

## 4. Elevation

Lightly layered. Cards carry a permanent, soft ambient shadow — never heavy, more paper resting on a desk than glass floating above a surface. On interaction, this shadow deepens and the card lifts (translateY -4px), signaling interactivity clearly without animation theatrics.

### Shadow Vocabulary
- **Ambient** (`0 1px 4px rgba(0,32,63,0.06), 0 4px 16px rgba(0,32,63,0.08)`): Default card shadow. All white cards on tinted backgrounds carry this.
- **Lifted** (`0 24px 56px rgba(0,32,63,0.14)`): On-hover state. Paired with `translateY(-4px)` transition at `0.22s ease`.
- **Elevated** (`0 8px 32px rgba(0,157,255,0.4)`): Reserved for the primary CTA button on dark (hero) backgrounds. The glow is the Sky Blue shadow — it reads as active and alive.
- **Admin Panel** (`0 2px 8px rgba(0,32,63,0.08)`): Sidebar and header panel shadow in the product register. Barely perceptible.

### Named Rules
**The Flat-at-Rest Rule.** Surfaces are only ever flat (Ambient) or lifted (Lifted). Never add a persistent strong shadow to a card — it reads as a modal, not a card. Strong shadows are reserved for the hero CTA.

**The Midnight Shadow Rule.** All shadows tint toward Midnight Navy (`rgba(0,32,63,...)`), not black (`rgba(0,0,0,...)`). A shadow tinted toward the brand hue reads as intentional. A black shadow reads as a browser default.

## 5. Components

### Buttons
The system has three button variants. All use the full pill radius (`9999px`). The pill is the signature shape — it signals approachability and rounds off every call to action.

- **Shape:** Full pill (9999px). No exceptions for primary and ghost. Outline buttons on dark may use `{rounded.md}` (12px) in compact contexts.
- **Primary:** Sky Blue → Sky Blue Deep gradient (`linear-gradient(135deg, #009dff, #007acc)`), white text, padding `16px 32px` at default, `10px 20px` at compact. On dark backgrounds, adds Elevated glow shadow. Hover: `scale(1.05)`, transition `0.2s ease`.
- **Ghost:** Transparent background, white/80 text, `border: 1px solid rgba(255,255,255,0.2)`. For use only on dark (Midnight Navy / hero gradient) surfaces. Hover: `background rgba(255,255,255,0.1)`.
- **Outline:** Transparent background, Sky Blue text, `border: 1.5px solid #009dff`. For use on white/light surfaces. Hover: `background #f0f7ff`.

### Chips & Badges
- **Style:** Pill shape (`9999px`), small padding (`4px 10px` or `2px 8px`). Background is a 10–15% opacity tint of the relevant color.
- **Status badge (paid):** `background #dcfce7`, `color #15803d`, label weight/uppercase.
- **Status badge (pending):** `background #fef3c7`, `color #b45309`.
- **Section eyebrow:** `background #e0f2fe`, `color #0369a1`, label uppercase tracking.

### Cards / Containers
- **Corner Style:** `{rounded.lg}` (20px) for content cards. `{rounded.md}` (12px) for compact product UI cells.
- **Background:** White (`#ffffff`) on Surface Blue (`#f0f7ff`) backgrounds. Year-level cards use their tinted bg (violet-bg, rose-bg, emerald-bg).
- **Shadow:** Ambient by default; Lifted on hover (with card-lift class).
- **Border:** `1px solid {colors.border-blue}` on white cards. Year-level cards use their own tinted border color.
- **Internal Padding:** `{spacing.lg}` (24px) standard; `{spacing.xl}` (32px) on pricing and prominent content cards.
- **Nested cards are prohibited.** A card inside a card collapses depth hierarchy. Use a bordered `div` or a `section` within a card's padding instead.

### Inputs / Fields
- **Style:** White background, `border: 1px solid {colors.border-blue}`, `{rounded.md}` (12px), `padding: 12px 16px`.
- **Focus:** `outline: 2px solid {colors.sky-blue}`, `outline-offset: 2px`, `border-radius: 6px`. The focus ring is always Sky Blue, always visible.
- **Error:** `border-color: #ef4444`, `color: #dc2626` for error message below field.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`.

### Navigation
- **Brand Surface (scrolled=false):** Transparent background, white text, white/80 links. Transition to opaque on scroll.
- **Scrolled:** `background: rgba(255,255,255,0.95)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid {colors.border-blue}`, Midnight Navy text.
- **Active link:** `color: {colors.sky-blue}`.
- **CTA in nav:** Primary pill button at compact size.
- **Mobile:** Full-width drawer below header, white bg, left-aligned links, full-width pill CTA.

### Admin Sidebar
- **Background:** Midnight Navy (`#00203F`), white text.
- **Active item:** `background: rgba(255,255,255,0.1)`, full weight text.
- **Inactive item:** `color: rgba(255,255,255,0.5)`, hover `rgba(255,255,255,0.05)`.
- **Width:** 240px fixed, hidden on mobile.

### Year-Level Selection Cards (Signature Component)
The booking funnel's year-level selector is a signature interactive card pattern: three chromatic cards (violet/rose/emerald), each flipping from tinted-bg to solid-fill when selected.

- **Default state:** Tinted background (`year-N-violet-bg`), `border-2 solid year-N-violet-border`, dark text inside.
- **Selected state:** Solid fill (`year-N-violet`), white text, white/20 inner badge, same border-radius.
- **Transition:** `0.2s ease` on all properties. `hover:scale(1.02)` on unselected.
- **Do not apply this fill-flip pattern to non-year-level contexts.** It is a booking funnel affordance, not a general selection pattern.

## 6. Do's and Don'ts

### Do:
- **Do** use Sky Blue for all primary actions, links, and focus states. It is the only action color in the system.
- **Do** express depth with the Midnight Navy shadow formula: `rgba(0,32,63,…)`, not black.
- **Do** keep Electric Cyan exclusively on dark (Midnight Navy / hero gradient) surfaces, and only in ≤2 places per screen.
- **Do** use the year-level palette (violet/rose/emerald) only within contexts that are explicitly year-specific — booking cards, enrollment tags, year-level badges.
- **Do** apply negative letter-spacing (`-0.025em`) to all display and headline type. It is non-negotiable for the design to feel premium rather than generic.
- **Do** add `transition: transform 0.22s ease, box-shadow 0.22s ease` to interactive cards, and pair it with `translateY(-4px)` and the Lifted shadow on hover.
- **Do** keep body copy at or above 1rem and below 72 characters per line. Readability for parents on phones is the constraint.
- **Do** respect `prefers-reduced-motion` by wrapping all `transform` and `transition` animations in a media query.

### Don't:
- **Don't** use gradient text (`background-clip: text` with a gradient fill). It is on the impeccable absolute ban list. The `.text-gradient` utility class in globals.css should not be added to new surfaces — replace with a single solid Sky Blue. (Note: currently used in the hero headline; flag for removal in a polish pass.)
- **Don't** use glassmorphism (`backdrop-filter: blur` + semi-transparent white background) as a default card treatment. The `.glass` utility is reserved for the hero badge only — one place, purposeful, not a pattern.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, callouts, or list items. This is on the absolute ban list. Use a background tint, leading icon, or nothing.
- **Don't** make the design look like a generic SaaS landing page: no hero metric cards, no identical icon-plus-heading-plus-text grid sections, no gradient headlines, no trust badge grids ("5000+ happy students!").
- **Don't** make it look like a cheap tutoring centre: no stock photo grids, no cluttered layouts, no text competing with other text.
- **Don't** make it feel corporate or cold: no all-caps hero headlines, no authoritative-but-distant voice, no reduction of warmth in the name of "professionalism".
- **Don't** over-brand with school material: the HSHS partnership is present and grounded but this is Everest's platform. The school is context, not the brand owner.
- **Don't** use black (`#000`) or pure white (`#fff`) as text or background. Midnight Navy (`#00203F`) is the dark anchor. White in the palette is `#ffffff` only because it is genuinely white — but tint backgrounds with Surface Blue where possible.
- **Don't** put nested cards inside cards. It destroys the elevation hierarchy. Use a bordered section or a subtle bg-tint row within a card's padding instead.
- **Don't** animate layout properties (`width`, `height`, `padding`, `top`, `left`). Only animate `transform` and `opacity`.
- **Don't** reference the old Everest website as a design reference. Start from this system.
