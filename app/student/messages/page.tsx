import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { getStudentForUser, getStudentClasses } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import MessagesView, { type ConvListItem, type SelectedThread } from '@/components/messaging/MessagesView'
import StudentStarters, { type ClassOption } from './StudentStarters'

export const metadata: Metadata = { title: 'Messages | Everest Tutoring' }
export const dynamic = 'force-dynamic'

export default async function StudentMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser(['student'])
  const student = await getStudentForUser(user.id)
  if (!student) {
    return <StudentShell sub="Messages"><p className="text-sm text-slate-500">Your student profile is being set up.</p></StudentShell>
  }
  const { c } = await searchParams

  const [classes, convs] = await Promise.all([
    getStudentClasses(student.id),
    prisma.conversation.findMany({
      where: { type: 'student', studentId: student.id },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        tutor: { select: { name: true } },
        subject: { select: { name: true } },
        messages: { where: { blocked: false }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ])

  const classOptions: ClassOption[] = classes.map((cl) => ({
    subjectId: cl.id,
    label: `${cl.name} (Year ${cl.yearLevel})${cl.tutorName ? ` · ${cl.tutorName}` : ''}`,
    tutorName: cl.tutorName,
  }))

  const conversations: ConvListItem[] = convs.map((cv) => ({
    id: cv.id,
    title: cv.tutor?.name ?? 'Your tutor',
    subtitle: cv.subject?.name ?? undefined,
    snippet: cv.messages[0]?.body ?? 'No messages yet',
    lastAt: cv.lastMessageAt,
    flaggedCount: 0,
    status: cv.status,
  }))

  let selected: SelectedThread | null = null
  if (c) {
    const conv = await prisma.conversation.findUnique({
      where: { id: c },
      include: {
        tutor: { select: { name: true } },
        subject: { select: { name: true } },
        messages: { where: { blocked: false }, include: { sender: { select: { name: true, role: true } }, attachments: { select: { id: true, url: true, originalName: true, mimeType: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (conv && conv.type === 'student' && conv.studentId === student.id) {
      selected = {
        id: conv.id,
        title: conv.tutor?.name ?? 'Your tutor',
        subtitle: conv.subject?.name ?? undefined,
        canReply: true,
        composerPlaceholder: 'Write a message to your tutor…',
        messages: conv.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderName: m.sender.name ?? m.sender.role,
          senderRole: m.sender.role,
          mine: m.senderId === user.id,
          createdAt: m.createdAt,
          flagged: false,
          attachments: m.attachments,
        })),
      }
    }
  }

  return (
    <StudentShell sub="Messages">
      <div className="mb-4">
        <h1 className="portal-title">Messages</h1>
        <p className="portal-lede">Chat with your tutor. Ask for practice, explain what you are stuck on, or share your school work.</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 mb-4 rounded-xl px-3 py-2.5" style={{ background: 'rgba(0,157,255,.06)', border: '1px solid rgba(0,157,255,.14)' }}>
        <ShieldCheck size={15} className="text-primary flex-shrink-0 mt-0.5" />
        Messages are visible to your parent and the Everest team for your safety and quality assurance, and are automatically screened. Please only contact your tutor through this platform.
      </div>

      <MessagesView
        conversations={conversations}
        selected={selected}
        basePath="/student/messages"
        emptyHint="No messages yet. Start a chat with your tutor above."
        starters={<StudentStarters classes={classOptions} />}
      />
    </StudentShell>
  )
}
