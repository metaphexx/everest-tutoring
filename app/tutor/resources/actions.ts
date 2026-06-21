'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { moderateContent } from '@/lib/hub-moderation'
import { notifyAdmin } from '@/lib/admin-notify'

async function tutorOwnsClass(classId: string, user: { id: string; role: string }) {
  const s = await prisma.subject.findUnique({ where: { id: classId }, select: { tutorId: true } })
  if (!s) return false
  return user.role === 'admin' || s.tutorId === user.id
}

export async function uploadResource(input: {
  title: string; description?: string; subject: string; yearLevel: number
  classId?: string; fileType?: string; weekNumber?: number; topic?: string; fileId?: string
}) {
  const user = await requireUser(['tutor'])
  const title = input.title?.trim()
  if (!title) return { ok: false, error: 'Please give the resource a title.' }
  if (input.classId && !(await tutorOwnsClass(input.classId, user))) return { ok: false, error: 'That class is not yours.' }
  if (input.fileId) {
    const owns = await prisma.fileAttachment.findFirst({ where: { id: input.fileId, uploadedById: user.id }, select: { id: true } })
    if (!owns) return { ok: false, error: 'Please attach a file you uploaded.' }
  }

  await prisma.tutorResource.create({
    data: {
      title,
      description: input.description?.trim() || null,
      subject: input.subject,
      yearLevel: input.yearLevel,
      classId: input.classId || null,
      fileType: input.fileType || 'other',
      weekNumber: input.weekNumber ?? null,
      topic: input.topic?.trim() || null,
      fileId: input.fileId || null,
      uploadedByTutorId: user.id,
      visibleToStudents: true,
    },
  })
  revalidatePath('/tutor/resources')
  revalidatePath('/student/resources')
  return { ok: true }
}

export async function toggleResourceVisibility(input: { id: string }) {
  const user = await requireUser(['tutor'])
  const r = await prisma.tutorResource.findUnique({ where: { id: input.id }, select: { uploadedByTutorId: true, visibleToStudents: true } })
  if (!r || (user.role !== 'admin' && r.uploadedByTutorId !== user.id)) return { ok: false }
  await prisma.tutorResource.update({ where: { id: input.id }, data: { visibleToStudents: !r.visibleToStudents } })
  revalidatePath('/tutor/resources')
  revalidatePath('/student/resources')
  return { ok: true, visible: !r.visibleToStudents }
}

export async function deleteResource(input: { id: string }) {
  const user = await requireUser(['tutor'])
  const r = await prisma.tutorResource.findUnique({ where: { id: input.id }, select: { uploadedByTutorId: true } })
  if (!r || (user.role !== 'admin' && r.uploadedByTutorId !== user.id)) return { ok: false }
  await prisma.tutorResource.delete({ where: { id: input.id } })
  revalidatePath('/tutor/resources')
  revalidatePath('/student/resources')
  return { ok: true }
}

export async function postAnnouncement(input: { classId: string; body: string }) {
  const user = await requireUser(['tutor'])
  const body = input.body.trim()
  if (body.length < 2) return { ok: false, error: 'Please write your announcement.' }
  if (!(await tutorOwnsClass(input.classId, user))) return { ok: false, error: 'That class is not yours.' }

  const mod = await moderateContent(body)
  const a = await prisma.announcement.create({
    data: { classId: input.classId, authorId: user.id, body, moderationStatus: mod.status },
  })
  if (mod.status !== 'clear') {
    await notifyAdmin({ type: 'flag', title: `Flagged announcement from ${user.name ?? 'a tutor'}`, body: mod.result.reason ?? '', href: '/admin/moderation', refKey: `ann-flag:${a.id}` })
  }
  revalidatePath('/tutor/resources')
  revalidatePath(`/tutor/classes/${input.classId}`)
  revalidatePath(`/student/classes/${input.classId}`)
  revalidatePath('/student')
  return { ok: true }
}

// A class-owning tutor (or admin) can pin/remove any post in their classroom;
// otherwise only the author can manage their own.
async function canManagePost(id: string, user: { id: string; role: string }) {
  const a = await prisma.announcement.findUnique({ where: { id }, select: { authorId: true, pinned: true, classId: true, class: { select: { tutorId: true } } } })
  if (!a) return null
  const ok = user.role === 'admin' || a.authorId === user.id || a.class.tutorId === user.id
  return ok ? a : null
}

export async function toggleAnnouncementPin(input: { id: string }) {
  const user = await requireUser(['tutor'])
  const a = await canManagePost(input.id, user)
  if (!a) return { ok: false }
  await prisma.announcement.update({ where: { id: input.id }, data: { pinned: !a.pinned } })
  revalidatePath('/tutor/resources')
  revalidatePath(`/tutor/classes/${a.classId}`)
  revalidatePath(`/student/classes/${a.classId}`)
  return { ok: true, pinned: !a.pinned }
}

export async function deleteAnnouncement(input: { id: string }) {
  const user = await requireUser(['tutor'])
  const a = await canManagePost(input.id, user)
  if (!a) return { ok: false }
  await prisma.announcement.delete({ where: { id: input.id } })
  revalidatePath('/tutor/resources')
  revalidatePath(`/tutor/classes/${a.classId}`)
  revalidatePath(`/student/classes/${a.classId}`)
  return { ok: true }
}
