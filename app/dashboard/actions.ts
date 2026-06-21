'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'

export async function setNotifPrefs(input: { emailOptOut: boolean; smsOptOut: boolean }) {
  const user = await requireUser(['parent'])
  await prisma.user.update({
    where: { id: user.id },
    data: { emailOptOut: input.emailOptOut, smsOptOut: input.smsOptOut },
  })
  revalidatePath('/dashboard')
  return { ok: true }
}
