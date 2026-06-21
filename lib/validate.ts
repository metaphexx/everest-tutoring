// Shared input validation, used by both the client forms and the server actions/
// routes that receive their data - so the field constraints and the server checks
// never drift apart.

export const LIMITS = {
  name: 60,
  email: 254,
  phone: 20,
  shortText: 200,
  notes: 1000,
  message: 4000,
} as const

// Pragmatic email shape: something@something.tld with no spaces.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(v: string): boolean {
  const t = v.trim()
  return t.length > 0 && t.length <= LIMITS.email && EMAIL_RE.test(t)
}

// Letters (any language/script), spaces, apostrophes, hyphens, dots. 1–60 chars.
const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u

export function isName(v: string): boolean {
  const t = v.trim()
  return t.length >= 1 && t.length <= LIMITS.name && NAME_RE.test(t)
}

// Drop characters that can't appear in a name as the user types.
export function sanitizeNameInput(v: string): string {
  return v.replace(/[^\p{L} .'-]/gu, '').slice(0, LIMITS.name)
}

// Keep only characters a phone number can contain (digits, +, spaces, -, ()).
export function sanitizePhoneInput(v: string): string {
  return v.replace(/[^\d+()\-\s]/g, '').slice(0, LIMITS.phone)
}

// Accepts Australian numbers: 10 digits starting 0 (mobile 04… / landline) or a
// +61 / 61 form (11 digits). Spaces/brackets/dashes are ignored.
export function isPhone(v: string): boolean {
  const d = v.replace(/\D/g, '')
  return /^0\d{9}$/.test(d) || /^61\d{9}$/.test(d)
}
