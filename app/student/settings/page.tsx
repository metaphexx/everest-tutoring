import type { Metadata } from 'next'
import { Mail, Phone, ShieldCheck, GraduationCap } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getStudentForUser, getStudentClasses } from '@/lib/student'
import StudentShell from '@/components/portal/StudentShell'
import NotifyToggle from './NotifyToggle'

export const metadata: Metadata = { title: 'Settings | Everest Tutoring' }

export default async function SettingsPage() {
  const user = await requireUser(['student'])
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true, emailOptOut: true } })
  const student = await getStudentForUser(user.id)
  const classes = student ? await getStudentClasses(student.id) : []

  return (
    <StudentShell sub="Settings">
      <div className="mb-5">
        <h1 className="portal-title">Settings</h1>
        <p className="portal-lede">Your account and notification preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Your account</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5"><GraduationCap size={15} className="text-slate-400" /><span className="text-slate-700">{account?.name ?? 'Student'}{student ? ` · Year ${student.yearLevel}` : ''}</span></div>
            <div className="flex items-center gap-2.5"><Mail size={15} className="text-slate-400" /><span className="text-slate-700">{account?.email}</span></div>
            {account?.phone && <div className="flex items-center gap-2.5"><Phone size={15} className="text-slate-400" /><span className="text-slate-700">{account.phone}</span></div>}
          </dl>
          {classes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">Your classes</p>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((c) => <span key={c.id} className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,157,255,.1)', color: '#007ECC' }}>{c.name} Y{c.yearLevel}</span>)}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">To update your details, ask a parent to contact the Everest team.</p>
        </section>

        <section className="glass-card glass-card-pad">
          <h2 className="portal-section-title mb-3">Notifications</h2>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-dark">Email updates</p>
              <p className="text-xs text-slate-500">Tutor replies, announcements and reminders.</p>
            </div>
            <NotifyToggle initialOn={!account?.emailOptOut} />
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-[13px] font-bold text-dark flex items-center gap-1.5 mb-1.5"><ShieldCheck size={14} className="text-primary" /> Staying safe</h3>
            <ul className="text-xs text-slate-500 space-y-1.5 leading-relaxed">
              <li>Student and tutor messages are visible to Everest admin for safety and quality assurance.</li>
              <li>Only communicate with tutors through this platform.</li>
              <li>Files, announcements and replies are monitored to keep the learning environment safe.</li>
            </ul>
          </div>
        </section>
      </div>
    </StudentShell>
  )
}
