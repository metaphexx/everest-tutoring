import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import AdminShell from '@/components/portal/AdminShell'
import MessagesView, { type ConvListItem, type SelectedThread } from '@/components/messaging/MessagesView'
import SupportSuggest from '@/components/admin/SupportSuggest'

export const metadata = { title: 'Messages · Admin' }
export const dynamic = 'force-dynamic'

// Canned replies the admin can drop into the composer with one tap.
const SAVED_REPLIES = [
  { label: 'Thanks', text: 'Thanks for reaching out - we appreciate you letting us know.' },
  { label: 'Looking into it', text: "Thanks for your message. We're looking into this and will get back to you within 24 hours." },
  { label: 'Makeup confirmed', text: "Your make-up class is confirmed - we've added it to the schedule and your child is all set." },
  { label: 'Confirm time', text: 'Could you confirm your preferred day and time so we can lock it in?' },
  { label: 'Resolved', text: "That's all sorted now. Let us know if there's anything else we can help with." },
]

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser(['admin'])
  const { c } = await searchParams

  const convs = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: {
      parent: { select: { name: true } },
      tutor: { select: { name: true } },
      subject: { select: { name: true, yearLevel: true } },
      student: { select: { firstName: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  const conversations: ConvListItem[] = convs.map((cv) => ({
    id: cv.id,
    title: cv.type === 'support' ? `Support · ${cv.parent.name}` : `${cv.parent.name} ↔ ${cv.tutor?.name ?? 'Tutor'}`,
    subtitle: cv.type === 'tutor' ? `${cv.student?.firstName ?? ''} · ${cv.subject?.name ?? ''}` : (cv.topic ?? undefined),
    snippet: cv.messages[0]?.body ?? 'No messages yet',
    lastAt: cv.lastMessageAt,
    flaggedCount: cv.flaggedCount,
    tags: cv.type === 'support' ? (cv.aiTags?.split(',').filter(Boolean) ?? undefined) : undefined,
    status: cv.status,
  }))

  let selected: SelectedThread | null = null
  let selectedIsSupport = false
  if (c) {
    const conv = await prisma.conversation.findUnique({
      where: { id: c },
      include: {
        parent: { select: { name: true } },
        tutor: { select: { name: true } },
        subject: { select: { name: true } },
        student: { select: { firstName: true } },
        messages: { include: { sender: { select: { name: true, role: true } }, attachments: { select: { id: true, url: true, originalName: true, mimeType: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (conv) {
      selected = {
        id: conv.id,
        title: conv.type === 'support' ? `Support · ${conv.parent.name}` : `${conv.parent.name} & ${conv.tutor?.name ?? 'Tutor'}`,
        subtitle: conv.type === 'tutor' ? `${conv.student?.firstName ?? ''} · ${conv.subject?.name ?? ''} (monitoring)` : (conv.topic ?? undefined),
        summary: conv.aiSummary,
        canReply: conv.type === 'support',
        composerPlaceholder: 'Reply to the parent…',
        priority: conv.priority,
        messages: conv.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderName: m.sender.name ?? m.sender.role,
          senderRole: m.sender.role,
          mine: m.senderId === user.id,
          createdAt: m.createdAt,
          flagged: m.flagged,
          flagCategory: m.flagCategory,
          flagSeverity: m.flagSeverity,
          flagReason: m.flagReason,
          attachments: m.attachments,
        })),
      }
      selectedIsSupport = conv.type === 'support'
    }
  }

  return (
    <AdminShell sub="Messages">
      <h1 className="portal-title">Messages</h1>
      <p className="portal-lede">Monitor parent-tutor chats and reply to support requests. Elliot summarises each thread and flags anything that needs a look.</p>
      <div className="mt-5">
        {selected && selectedIsSupport && <SupportSuggest conversationId={selected.id} />}
        <MessagesView conversations={conversations} selected={selected} basePath="/admin/messages" showFlags showSummary emptyHint="No conversations yet." templates={SAVED_REPLIES} />
      </div>
    </AdminShell>
  )
}
