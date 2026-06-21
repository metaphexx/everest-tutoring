/**
 * The single branded email shell for all transactional/outbound email.
 *
 * Every message sent through `sendEmail` (lib/resend.ts) is rendered with this
 * template, so reminders, win-backs, waitlist offers, moderation notices, class
 * changes etc. all share one consistent, on-brand look - navy→blue gradient
 * header, white content card, and a footer with contact details. Plain-text
 * bodies are HTML-escaped and line breaks + URLs are preserved, so callers keep
 * writing simple `text` and never hand-roll HTML.
 *
 * Brand: navy #00203F, brand blue #009dff. Keep in sync with the design tokens.
 */

const BRAND = {
  navy: '#00203F',
  blue: '#009dff',
  blue700: '#007ECC',
  ink: '#475569',
  muted: '#94a3b8',
  card: '#ffffff',
  page: '#f5f8fb',
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Escape, then turn bare URLs into links and newlines into <br>. Safe order:
// escape first so we never inject markup from the source text.
function richText(text: string): string {
  const escaped = esc(text)
  const linked = escaped.replace(/\b(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:${BRAND.blue700};text-decoration:underline;">${url}</a>`)
  return linked.replace(/\n/g, '<br>')
}

export type EmailOptions = {
  subject: string
  bodyText: string
  heading?: string
  cta?: { label: string; url: string }
  /** Hidden inbox-preview line. */
  preheader?: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://everesttutoring.com.au'

export function renderBrandedEmail(opts: EmailOptions): string {
  const heading = opts.heading ? `<h1 style="color:${BRAND.navy};font-size:22px;font-weight:800;margin:0 0 16px;font-family:'Montserrat',Arial,sans-serif;">${esc(opts.heading)}</h1>` : ''
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,${BRAND.blue},${BRAND.blue700});">
         <a href="${opts.cta.url}" style="display:inline-block;padding:13px 26px;color:#fff;font-weight:700;text-decoration:none;font-family:'Montserrat',Arial,sans-serif;">${esc(opts.cta.label)}</a>
       </td></tr></table>`
    : ''
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:'Inter',Arial,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,32,63,0.08);">
        <tr><td style="background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.blue} 100%);padding:28px 36px;">
          <div style="color:#fff;font-size:20px;font-weight:800;font-family:'Montserrat',Arial,sans-serif;letter-spacing:-0.01em;">Everest Tutoring</div>
          <div style="color:rgba(255,255,255,0.82);font-size:13px;margin-top:2px;">× Harrisdale Senior High School</div>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          ${heading}
          <div style="color:${BRAND.ink};font-size:15px;line-height:1.7;">${richText(opts.bodyText)}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 36px 28px;border-top:1px solid #eef2f6;">
          <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
            Everest Tutoring · On campus at Harrisdale Senior High School, WA 6112<br>
            <a href="${APP_URL}" style="color:${BRAND.blue700};text-decoration:none;">everesttutoring.com.au</a> · ABN 39 601 405 047
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
