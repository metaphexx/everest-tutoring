import Link from 'next/link'
import type { Metadata } from 'next'
import { MessageCircleQuestion, Lock, Users } from 'lucide-react'
import { prisma } from '@/lib/db'
import { statusMeta } from '@/lib/question-status'
import AdminShell from '@/components/portal/AdminShell'

export const metadata: Metadata = { title: 'Questions · Admin' }
export const dynamic = 'force-dynamic'

function fmt(d: Date) { return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const where = status && status !== 'all' ? { status, blocked: false } : { blocked: false }
  const [questions, waiting] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true } },
        class: { select: { name: true, yearLevel: true, tutor: { select: { name: true } } } },
        _count: { select: { replies: true, reactions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.question.count({ where: { status: 'waiting_for_tutor', blocked: false } }),
  ])

  const TABS = [['all', 'All'], ['waiting_for_tutor', 'Waiting'], ['follow_up_needed', 'Follow-up'], ['solved', 'Solved']] as const

  return (
    <AdminShell sub="Questions">
      <div className="mb-4">
        <h1 className="portal-title flex items-center gap-2"><MessageCircleQuestion size={22} className="text-primary" /> Student questions</h1>
        <p className="portal-lede">{waiting} waiting for a tutor across all classes.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-4 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.6)', width: 'fit-content' }}>
        {TABS.map(([v, label]) => {
          const active = (status ?? 'all') === v
          return <Link key={v} href={`/admin/questions?status=${v}`} className="text-[13px] font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap" style={active ? { background: 'linear-gradient(135deg,#009dff,#007acc)', color: '#fff' } : { color: '#5E6B7C' }}>{label}</Link>
        })}
      </div>

      <div className="glass-card overflow-hidden">
        {questions.length === 0 ? (
          <p className="text-sm text-slate-400 p-5 text-center">No questions.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(15,42,79,.06)' }}>
            {questions.map((q) => {
              const meta = statusMeta(q.status)
              return (
                <div key={q.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      {q.visibility === 'public_to_class' ? <Users size={11} className="text-slate-400" /> : <Lock size={11} className="text-slate-400" />}
                    </div>
                    <p className="text-[13px] font-semibold text-dark truncate">{q.title}</p>
                    <p className="text-[11px] text-slate-400">{q.student.firstName} {q.student.lastName} · {q.class.name} Y{q.class.yearLevel} · {q.class.tutor?.name ?? 'unassigned'} · {fmt(q.createdAt)}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 text-right flex-shrink-0">
                    <div>{q._count.replies} replies</div>
                    <div>{q._count.reactions} reactions</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
