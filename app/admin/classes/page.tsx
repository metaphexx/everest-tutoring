import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import AdminShell from '@/components/portal/AdminShell'

export const metadata = { title: 'Classes - Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, { color: string }> = {
  8: { color: '#7C3AED' },
  9: { color: '#EC4899' },
  10: { color: '#22C55E' },
}
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default async function ClassesPage() {
  const subjects = await prisma.subject.findMany({
    include: {
      enrollments: { where: { status: 'active' }, include: { student: true } },
      tutor: { select: { name: true } },
      term: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { yearLevel: 'asc' }],
  })

  return (
    <AdminShell sub="Classes">
      <h1 className="portal-title">Classes</h1>
      <p className="portal-lede">{subjects.length} classes · Term 3 2026</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {subjects.map((subject) => {
          const yc = YEAR_COLORS[subject.yearLevel] ?? { color: '#009dff' }
          const enrolled = subject.enrollments.length
          const pct = Math.round((enrolled / subject.capacity) * 100)
          const isFull = enrolled >= subject.capacity
          const isNearFull = enrolled >= subject.capacity - 2

          return (
            <Link key={subject.id} href={`/admin/classes/${subject.id}`} className="glass-card glass-card-pad is-interactive block">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: yc.color }}>Y{subject.yearLevel}</span>
                  <span className="font-display font-bold text-dark">{subject.name}</span>
                </div>
                {isFull && <Badge variant="danger" size="sm">Full</Badge>}
                {isNearFull && !isFull && <Badge variant="warning" size="sm">Almost full</Badge>}
              </div>

              <p className="text-xs text-slate-500 mb-1">{DAY_NAMES[subject.dayOfWeek]} · {subject.startTime}–{subject.endTime}</p>
              <p className="text-xs text-slate-400 mb-3">Tutor: {subject.tutor?.name ?? 'Unassigned'}</p>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{enrolled} enrolled</span>
                  <span>{subject.capacity - enrolled} spots left</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isFull ? '#EF4444' : isNearFull ? '#F59E0B' : yc.color }} />
                </div>
              </div>

              <div className="space-y-1.5">
                {subject.enrollments.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: yc.color }} />
                    <span className="text-slate-600">{e.student.firstName} {e.student.lastName}</span>
                  </div>
                ))}
                {enrolled > 5 && <p className="text-xs text-slate-400 pl-3.5">+{enrolled - 5} more</p>}
                {enrolled === 0 && <p className="text-xs text-slate-300">No students enrolled</p>}
              </div>
            </Link>
          )
        })}
      </div>
    </AdminShell>
  )
}
