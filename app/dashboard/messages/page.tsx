import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import MessagesView, { type ConvListItem, type SelectedThread } from '@/components/messaging/MessagesView'
import ParentStarters from './ParentStarters'

export const metadata = { title: 'Messages' }
export const dynamic = 'force-dynamic'

export default async function ParentMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser(['parent'])
  const { c } = await searchParams

  const [convs, students] = await Promise.all([
    prisma.conversation.findMany({
      where: { parentId: user.id },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        tutor: { select: { name: true } },
        subject: { select: { name: true } },
        student: { select: { firstName: true } },
        // Exclude blocked (poaching/abuse) messages so the parent never sees them.
        messages: { where: { blocked: false }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.student.findMany({ where: { parentId: user.id }, include: { enrollments: { where: { status: 'active' }, include: { subject: true } } } }),
  ])

  const classOptions = students.flatMap((st) =>
    st.enrollments.map((e) => ({
      value: `${e.subjectId}__${st.id}`,
      label: `${st.firstName} · ${e.subject.name} (Y${e.subject.yearLevel})`,
      subjectId: e.subjectId,
      studentId: st.id,
    })),
  )

  const conversations: ConvListItem[] = convs.map((cv) => ({
    id: cv.id,
    title: cv.type === 'support' ? 'Everest support' : (cv.tutor?.name ?? 'Tutor'),
    subtitle: cv.type === 'tutor' ? `${cv.student?.firstName ?? ''} · ${cv.subject?.name ?? ''}` : (cv.topic ?? undefined),
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
        student: { select: { firstName: true } },
        messages: { where: { blocked: false }, include: { sender: { select: { name: true, role: true } }, attachments: { select: { id: true, url: true, originalName: true, mimeType: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (conv && conv.parentId === user.id) {
      selected = {
        id: conv.id,
        title: conv.type === 'support' ? 'Everest support' : (conv.tutor?.name ?? 'Tutor'),
        subtitle: conv.type === 'tutor' ? `${conv.student?.firstName ?? ''} · ${conv.subject?.name ?? ''}` : (conv.topic ?? undefined),
        canReply: true,
        composerPlaceholder: 'Write a message…',
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
    <PortalShell eyebrow="Parent" sub="Messages" user={{ name: user.name, role: 'parent' }}>
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <h1 className="portal-title">Messages</h1>
      <p className="portal-lede">Chat with your child&apos;s tutor or get help from the Everest team.</p>
      <div className="mt-5">
        <MessagesView
          conversations={conversations}
          selected={selected}
          basePath="/dashboard/messages"
          emptyHint="No messages yet. Start one above."
          starters={<ParentStarters classes={classOptions} />}
        />
      </div>
    </PortalShell>
  )
}
