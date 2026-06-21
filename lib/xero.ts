import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'

/**
 * Xero accounting sync. Mirrors the safe pattern used by lib/notify.ts:
 * until real Xero credentials are present everything runs in PREVIEW mode -
 * the invoice is fully composed and logged to the Notification audit, but
 * nothing is pushed to Xero. Add a Custom Connection (client credentials) in
 * the Xero developer portal and set the env vars below to go live.
 */

// A credential is "real" only if present and not a placeholder.
const real = (v: string | undefined) => !!v && v.trim().length > 0 && !v.includes('...')

export const hasXero =
  real(process.env.XERO_CLIENT_ID) && real(process.env.XERO_CLIENT_SECRET)

// Accounting config - safe AU defaults. Because we cannot know your GST
// registration, the default produces a NO-GST invoice; set XERO_TAX_TYPE
// (e.g. "OUTPUT" for GST on Income) and XERO_LINE_AMOUNT_TYPE ("Inclusive")
// once you confirm your Xero org's tax setup.
const SALES_ACCOUNT = process.env.XERO_SALES_ACCOUNT_CODE || '200' // Sales / Income
const CLEARING_ACCOUNT = process.env.XERO_CLEARING_ACCOUNT_CODE || '090' // Stripe clearing bank account
const TAX_TYPE = process.env.XERO_TAX_TYPE || 'NONE'
const LINE_AMOUNT_TYPE = process.env.XERO_LINE_AMOUNT_TYPE || 'NoTax' // NoTax | Inclusive | Exclusive

export type XeroSyncResult = {
  status: 'invoiced' | 'preview' | 'skipped' | 'failed'
  live: boolean
  invoiceNumber?: string
  error?: string
}

type InvoiceLine = { description: string; amountCents: number }

// Splits the exact amount charged across the enrolment lines so the invoice
// total always reconciles to the Stripe payment (no rounding drift).
function buildLines(booking: BookingWithRels): InvoiceLine[] {
  const totalCents = booking.totalAmountCents
  const items = booking.enrollments
  if (items.length === 0) {
    return [{ description: `Tutoring - ${booking.term.name}`, amountCents: totalCents }]
  }
  const per = Math.floor(totalCents / items.length)
  const remainder = totalCents - per * items.length
  return items.map((e, i) => ({
    description: `Y${e.subject.yearLevel} ${e.subject.name} - ${e.student.firstName} ${e.student.lastName} (${booking.term.name}, ${booking.weeksRemaining} weeks)`,
    amountCents: per + (i < remainder ? 1 : 0),
  }))
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

type BookingWithRels = NonNullable<Awaited<ReturnType<typeof loadBooking>>>

function loadBooking(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      term: true,
      enrollments: { include: { subject: true, student: true } },
    },
  })
}

/**
 * Create a paid Xero sales invoice for a booking and email a receipt.
 * Idempotent (skips if already invoiced) and fail-safe: never throws, so a
 * Xero outage can never break the Stripe payment webhook.
 */
export async function syncBookingToXero(bookingId: string): Promise<XeroSyncResult> {
  const booking = await loadBooking(bookingId)
  if (!booking) return { status: 'failed', live: hasXero, error: 'Booking not found' }

  // Idempotency: a live invoice already exists, or a preview was already logged.
  if (booking.xeroInvoiceId) {
    return { status: 'skipped', live: hasXero, invoiceNumber: booking.xeroInvoiceNumber ?? undefined }
  }
  const refKey = `invoice:${booking.id}`
  const alreadyLogged = await prisma.notification.findUnique({ where: { refKey } })
  if (alreadyLogged) return { status: 'skipped', live: hasXero }

  const lines = buildLines(booking)
  const total = booking.totalAmountCents
  const recipient = booking.user.email ?? booking.user.name ?? 'unknown'
  const summary = lines.map((l) => `- ${l.description}: ${money(l.amountCents)}`).join('\n')
  const body =
    `Invoice for booking ${booking.confirmationCode ?? booking.id} (${booking.user.name ?? recipient})\n` +
    `${summary}\nTotal: ${money(total)} (paid)`

  let status: XeroSyncResult['status'] = 'preview'
  let error: string | null = null
  let invoiceId: string | null = null
  let invoiceNumber: string | null = null
  let contactId: string | null = null

  if (hasXero) {
    try {
      const result = await pushToXero(booking, lines)
      invoiceId = result.invoiceId
      invoiceNumber = result.invoiceNumber
      contactId = result.contactId
      status = 'invoiced'
      // Email a branded receipt (best-effort; receipt failure doesn't fail sync).
      if (booking.user.email) {
        try {
          await sendEmail({
            to: booking.user.email,
            subject: `Your Everest Tutoring invoice ${invoiceNumber ?? ''}`.trim(),
            text: `Hi ${booking.user.name ?? 'there'},\n\nThanks for your booking. Your tax invoice ${invoiceNumber ?? ''} is attached to your account.\n\n${summary}\n\nTotal paid: ${money(total)}\n\nEverest Tutoring`,
          })
        } catch {
          /* receipt email is best-effort */
        }
      }
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
    }
  }

  // Persist the outcome on the booking.
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      xeroContactId: contactId,
      xeroInvoiceId: invoiceId,
      xeroInvoiceNumber: invoiceNumber,
      xeroStatus: status === 'failed' ? 'failed' : status === 'invoiced' ? 'invoiced' : 'preview',
      xeroSyncedAt: new Date(),
    },
  })

  // Audit log (deduped on refKey) - shows up in /admin/communications.
  await prisma.notification.create({
    data: {
      userId: booking.userId,
      channel: 'email',
      type: 'invoice',
      recipient,
      subject: `Invoice ${invoiceNumber ?? '(preview)'} - ${money(total)}`,
      body,
      status,
      refKey,
      error,
    },
  })

  return { status, live: hasXero, invoiceNumber: invoiceNumber ?? undefined, error: error ?? undefined }
}

// ---- Live Xero push (only reached when real credentials are configured) ----
// Uses a dynamic import so the SDK is never loaded in preview mode. Typed
// loosely on purpose: the payload shape is owned by the xero-node SDK.
async function pushToXero(
  booking: BookingWithRels,
  lines: InvoiceLine[],
): Promise<{ invoiceId: string; invoiceNumber: string; contactId: string }> {
  const xeroPkg = await import('xero-node')
  const { XeroClient, Invoice } = xeroPkg

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    grantType: 'client_credentials',
  })
  await xero.getClientCredentialsToken()

  // Custom Connections use an empty tenant id; fall back to a discovered one.
  let tenantId = ''
  try {
    await xero.updateTenants(false)
    tenantId = xero.tenants?.[0]?.tenantId ?? ''
  } catch {
    /* client-credentials orgs expose no connections list - empty id is correct */
  }

  const email = booking.user.email ?? undefined
  const name = booking.user.name ?? email ?? 'Customer'

  // Find or create the contact (matched by email when available).
  let contactId: string | undefined
  if (email) {
    const found = await xero.accountingApi.getContacts(tenantId, undefined, `EmailAddress="${email}"`)
    contactId = found.body.contacts?.[0]?.contactID
  }
  if (!contactId) {
    const [firstName, ...rest] = name.split(' ')
    const created = await xero.accountingApi.createContacts(tenantId, {
      contacts: [{ name, firstName, lastName: rest.join(' ') || undefined, emailAddress: email }],
    })
    contactId = created.body.contacts?.[0]?.contactID
  }
  if (!contactId) throw new Error('Could not resolve Xero contact')

  const today = new Date().toISOString().split('T')[0]
  const invoicePayload = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: contactId },
    date: today,
    dueDate: today,
    reference: booking.confirmationCode ?? undefined,
    status: Invoice.StatusEnum.AUTHORISED,
    lineAmountTypes: LINE_AMOUNT_TYPE as never,
    lineItems: lines.map((l) => ({
      description: l.description,
      quantity: 1,
      unitAmount: l.amountCents / 100,
      accountCode: SALES_ACCOUNT,
      taxType: TAX_TYPE,
    })),
  }
  const invRes = await xero.accountingApi.createInvoices(tenantId, { invoices: [invoicePayload as never] })
  const inv = invRes.body.invoices?.[0]
  if (!inv?.invoiceID) throw new Error('Xero did not return an invoice id')

  // Mark it paid by applying the payment to the Stripe clearing account.
  await xero.accountingApi.createPayments(tenantId, {
    payments: [
      {
        invoice: { invoiceID: inv.invoiceID },
        account: { code: CLEARING_ACCOUNT },
        date: today,
        amount: booking.totalAmountCents / 100,
      },
    ],
  })

  return {
    invoiceId: inv.invoiceID,
    invoiceNumber: inv.invoiceNumber ?? inv.invoiceID,
    contactId,
  }
}
