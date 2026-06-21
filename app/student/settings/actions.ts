'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/session'

// A student toggling their own email updates.
export async function setEmailUpdates(input: { on: boolean }) {
  const user = await requireStudent()
  await prisma.user.update({ where: { id: user.id }, data: { emailOptOut: !input.on } })
  revalidatePath('/student/settings')
  return { ok: true }
}
