import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { ChevronRight } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import DeleteParentButton from './DeleteParentButton'

export const metadata = { title: 'Students - Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    include: {
      parent: true,
      enrollments: { include: { subject: true, booking: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AdminShell sub="Students">
      <h1 className="portal-title">Students</h1>
      <p className="portal-lede">{students.length} enrolled this term</p>

      <div className="glass-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(15,42,79,.1)', background: 'rgba(255,255,255,.4)' }}>
                {['Student', 'Year', 'Parent / contact', 'Subjects', 'Weeks', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(15,42,79,.05)' }}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/students/${s.id}`} className="inline-flex items-center gap-1 font-semibold text-dark hover:text-primary group">
                      {s.firstName} {s.lastName}
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-primary" />
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: YEAR_COLORS[s.yearLevel] ?? '#009dff' }}>Y{s.yearLevel}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-dark">{s.parent.name}</p>
                    <p className="text-xs text-slate-400">{s.parent.email}</p>
                    {s.parent.phone && <p className="text-xs text-slate-400">{s.parent.phone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {s.enrollments.map((e) => (
                        <span key={e.id} className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>{e.subject.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{s.enrollments[0]?.booking?.weeksRemaining ?? '-'}</td>
                  <td className="px-5 py-4">
                    <Badge variant={s.status === 'active' ? 'success' : 'neutral'}>
                      {s.status === 'active' ? 'Active' : 'Withdrawn'}
                    </Badge>
                    {s.parent.lifecycleStage === 'alumni' && <Badge size="sm" className="ml-1.5 bg-pink-100 text-pink-700">alumni</Badge>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DeleteParentButton parentId={s.parentId} parentName={s.parent.name ?? 'this parent'} />
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-300">No students enrolled yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
