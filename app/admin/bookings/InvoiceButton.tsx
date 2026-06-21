'use client'

import { useTransition } from 'react'
import { generateInvoice } from './actions'

export default function InvoiceButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await generateInvoice(bookingId) })}
      className="px-2.5 py-1 rounded-full text-xs font-medium border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 disabled:opacity-50"
    >
      {pending ? 'Generating...' : 'Generate invoice'}
    </button>
  )
}
