'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { generateTermReports } from '@/lib/term-reports'

/** Auto-draft end-of-term reports for the active term (unpublished, for review). */
export async function autoDraftTermReports(input?: { regenerate?: boolean }) {
  await requireUser(['admin'])
  const res = await generateTermReports({ regenerate: input?.regenerate })
  revalidatePath('/admin/reports')
  return res
}
