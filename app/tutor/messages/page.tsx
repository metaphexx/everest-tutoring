import { ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import MessagesView, { type ConvListItem, type SelectedThread } from '@/components/messaging/MessagesView'

export const metadata = { title: 'Messages · Tutor' }
export const dynamic = 'force-dynamic'

export default async function TutorMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser(['tutor'])
  const { c } = await searchParams

  // Tutors chat with both parents (type 'tutor') and students (type 'student').
  const convs = await prisma.conversation.findMany({
    where: { type: { in: ['tutor', 'student'] }, tutorId: user.id },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      parent: { select: { name: true } },
      subject: { select: { name: true } },
      student: { select: { firstName: true } },
      // Withheld (auto-screened) messages are never shown - admin only.
      messages: { where: { blocked: false }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  const titleFor = (cv: { type: string; parent: { name: string | null }; student: { firstName: string } | null }) =>
    cv.type === 'student' ? (cv.student?.firstName ?? 'Student') : (cv.parent.name ?? 'Parent')

  const conversations: ConvListItem[] = convs.map((cv) => ({
    id: cv.id,
    title: titleFor(cv),
    subtitle: `${cv.type === 'student' ? 'Student' : cv.student?.firstName ?? ''} · ${cv.subject?.name ?? ''}`,
    snippet: cv.messages[0]?.body ?? 'No messages yet',
    lastAt: cv.lastMessageAt,
    flaggedCount: 0, // moderation flags are admin-only
  }))

  let selected: SelectedThread | null = null
  if (c) {
    const conv = await prisma.conversation.findUnique({
      where: { id: c },
      include: {
        parent: { select: { name: true } },
        subject: { select: { name: true } },
        student: { select: { firstName: true } },
        messages: { where: { blocked: false }, include: { sender: { select: { name: true, role: true } }, attachments: { select: { id: true, url: true, originalName: true, mimeType: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (conv && conv.tutorId === user.id) {
      selected = {
        id: conv.id,
        title: titleFor(conv),
        subtitle: `${conv.student?.firstName ?? ''} · ${conv.subject?.name ?? ''}`,
        canReply: true,
        composerPlaceholder: conv.type === 'student' ? 'Reply to the student…' : 'Reply to the parent…',
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
    <PortalShell eyebrow="Tutor" sub="Messages" user={user}>
      <h1 className="portal-title">Messages</h1>
      <p className="portal-lede">Chat with the parents and students in your classes.</p>

      <div className="flex items-start gap-2 text-xs text-slate-500 mt-4 mb-1 rounded-xl px-3 py-2.5" style={{ background: 'rgba(0,157,255,.06)', border: '1px solid rgba(0,157,255,.14)' }}>
        <ShieldCheck size={15} className="text-primary flex-shrink-0 mt-0.5" />
        All conversations are monitored by the Everest team and automatically screened. Messages with abusive or off-platform content are withheld and reviewed. Keep all contact professional and on this platform.
      </div>

      <div className="mt-4">
        <MessagesView conversations={conversations} selected={selected} basePath="/tutor/messages" emptyHint="No messages yet." />
      </div>
    </PortalShell>
  )
}
