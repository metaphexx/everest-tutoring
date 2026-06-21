'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function markRead(id: string) {
  await requireUser(['admin'])
  await prisma.adminNotification.update({ where: { id }, data: { read: true } })
  revalidatePath('/admin/notifications')
}

export async function markAllRead() {
  await requireUser(['admin'])
  await prisma.adminNotification.updateMany({ where: { read: false }, data: { read: true } })
  revalidatePath('/admin/notifications')
}
