'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/session'
import { getStudentForUser } from '@/lib/student'
import { moderateContent } from '@/lib/hub-moderation'
import { notifyAdmin } from '@/lib/admin-notify'

// A student posting a note to their classroom stream. Anyone enrolled can post;
// posts are stored as Announcements (authored by the student) so they sit in the
// same feed as tutor announcements. Runs through the shared moderation pipeline.
export async function postToClass(input: { classId: string; body: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }
  const body = input.body.trim()
  if (body.length < 2) return { ok: false, error: 'Please write a little more.' }
  if (body.length > 2000) return { ok: false, error: 'That post is a little long. Please shorten it.' }

  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId: input.classId, status: 'active', subject: { term: { isActive: true } } },
    select: { id: true },
  })
  if (!enrolled) return { ok: false, error: 'You can only post in your own classes.' }

  const mod = await moderateContent(body)
  const post = await prisma.announcement.create({
    data: { classId: input.classId, authorId: user.id, body, moderationStatus: mod.status },
  })

  if (mod.status !== 'clear') {
    await notifyAdmin({
      type: 'flag',
      title: `Flagged class post from ${student.firstName} ${student.lastName}`,
      body: mod.result.reason ?? 'The AI moderator flagged this class post for review.',
      href: '/admin/moderation',
      refKey: `post-flag:${post.id}`,
    })
  }

  revalidatePath(`/student/classes/${input.classId}`)
  return { ok: true, held: mod.status === 'needs_review' }
}
