'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { reportMissedSession, bookMakeup } from '@/lib/makeup'

export async function reportMiss(input: { studentId: string; missedSubject: string; missedDateLabel: string; note?: string }) {
  const user = await requireUser(['parent'])
  const r = await reportMissedSession({ parentId: user.id, ...input })
  revalidatePath('/dashboard/makeup')
  return r
}

export async function bookMakeupClass(input: { missedSessionId: string; makeupSubjectId: string; makeupDateLabel: string }) {
  const user = await requireUser(['parent'])
  const r = await bookMakeup({ parentId: user.id, ...input })
  revalidatePath('/dashboard/makeup')
  return r
}
