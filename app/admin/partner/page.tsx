import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { format, startOfDay } from 'date-fns'
import { UserPlus, CalendarDays, Megaphone, FileText } from 'lucide-react'
import AdminShell from '@/components/portal/AdminShell'
import ReferralStatus from './ReferralStatus'
import ReferralOutreach from './ReferralOutreach'
import AssessmentView from './AssessmentView'
import AdminOutlineUpload from './AdminOutlineUpload'
import { parseTopics } from '@/lib/outline'

export const metadata = { title: 'HSHS Partner · Admin' }
export const dynamic = 'force-dynamic'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default async function AdminPartnerPage() {
  const [referrals, notices, assessments, outlines, enrolledStudents] = await Promise.all([
    prisma.referral.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.schoolNotice.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.assessmentDate.findMany({ where: { date: { gte: startOfDay(new Date()) } }, orderBy: { date: 'asc' } }),
    prisma.courseOutline.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.student.findMany({ where: { enrollments: { some: { status: 'active' } } }, select: { firstName: true, lastName: true } }),
  ])

  // A referral has "converted" once a student of that name is actively enrolled.
  const enrolledNames = new Set(enrolledStudents.map((s) => `${s.firstName} ${s.lastName}`.toLowerCase().trim()))
  const isConverted = (name: string) => enrolledNames.has(name.toLowerCase().trim())
  const newReferrals = referrals.filter((r) => r.status === 'new').length
  const convertedCount = referrals.filter((r) => isConverted(r.studentName)).length
  const calItems = assessments.map((a) => ({ id: a.id, date: a.date.toISOString(), yearLevel: a.yearLevel, subject: a.subject, title: a.title }))

  return (
    <AdminShell sub="HSHS partner">
      <h1 className="portal-title">HSHS partner channel</h1>
      <p className="portal-lede">Referrals, assessment dates and notices shared by Harrisdale SHS.</p>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        {/* Referrals (leads) */}
        <div className="glass-card glass-card-pad">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={17} className="text-primary" />
            <h2 className="portal-section-title">Student referrals</h2>
            {newReferrals > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,157,255,.12)', color: '#007ECC' }}>{newReferrals} new</span>}
            {convertedCount > 0 && <Badge variant="success" size="sm" className="font-bold">{convertedCount} enrolled</Badge>}
          </div>
          <p className="text-xs text-slate-500 mb-3">Warm leads the school thinks would benefit from tutoring.</p>
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-400">No referrals yet.</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: YEAR_COLORS[r.yearLevel] ?? '#009dff' }}>Y{r.yearLevel}</span>
                    <p className="text-sm font-semibold text-dark">{r.studentName}</p>
                    {r.subject && <span className="text-xs text-slate-500">· {r.subject}</span>}
                    {isConverted(r.studentName) && <Badge variant="success" size="sm" className="font-bold">✓ enrolled</Badge>}
                    <span className="ml-auto"><ReferralStatus id={r.id} status={r.status} /></span>
                  </div>
                  <p className="text-sm text-slate-600">{r.reason}</p>
                  {(r.parentName || r.parentEmail || r.parentPhone) && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      <span className="font-medium text-slate-600">Parent:</span> {r.parentName ?? 'name not given'}
                      {r.parentEmail ? ` · ${r.parentEmail}` : ''}
                      {r.parentPhone ? ` · ${r.parentPhone}` : ''}
                    </p>
                  )}
                  {(r.outreachEmail || r.parentEmail || r.parentPhone) && (
                    <ReferralOutreach
                      referralId={r.id}
                      parentEmail={r.parentEmail}
                      parentPhone={r.parentPhone}
                      status={r.outreachStatus}
                      sentAt={r.outreachSentAt ? format(r.outreachSentAt, 'd MMM') : null}
                      subject={r.outreachSubject ?? ''}
                      email={r.outreachEmail ?? ''}
                      sms={r.outreachSms ?? ''}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessment calendar */}
        <div className="glass-card glass-card-pad">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={17} className="text-primary" />
            <h2 className="portal-section-title">Assessment calendar</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">Upcoming HSHS assessments - tutors align lessons to these.</p>
          <AssessmentView assessments={calItems} />
        </div>
      </div>

      {/* Course outlines */}
      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={17} style={{ color: '#0D9488' }} />
          <h2 className="portal-section-title">Course outlines</h2>
        </div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs text-slate-500">Outlines HSHS or admin uploaded. The AI pulls out assessment dates and the weekly topic plan for tutors.</p>
        </div>
        <div className="mb-3"><AdminOutlineUpload /></div>
        {outlines.length === 0 ? (
          <p className="text-sm text-slate-400">No outlines uploaded yet. HSHS can add them from their portal.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {outlines.map((o) => {
              const topics = parseTopics(o.topics)
              return (
                <div key={o.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: YEAR_COLORS[o.yearLevel] ?? '#009dff' }}>Y{o.yearLevel}</span>
                    <p className="text-sm font-semibold text-dark">{o.subject}</p>
                    <Badge size="sm" className={`ml-auto ${o.status === 'scanned' ? 'bg-teal-100 text-teal-700' : o.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{o.status}</Badge>
                  </div>
                  {o.scanSummary && <p className="text-xs text-slate-500 mb-1.5">{o.scanSummary}</p>}
                  {topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topics.slice(0, 6).map((t, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white/70 text-slate-600">{t.week != null ? `W${t.week}: ` : ''}{t.topic}</span>
                      ))}
                      {topics.length > 6 && <span className="text-[11px] text-slate-400">+{topics.length - 6} more</span>}
                    </div>
                  )}
                  {o.sourceUrl && <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary mt-1.5 inline-block">Open original file</a>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notices */}
      <div className="glass-card glass-card-pad mt-5">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={17} className="text-amber-600" />
          <h2 className="portal-section-title">Notices from the school</h2>
        </div>
        {notices.length === 0 ? (
          <p className="text-sm text-slate-400">No notices.</p>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-dark">{n.title}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 capitalize">{n.category}</span>
                  <span className="ml-auto text-xs text-slate-400">{format(n.createdAt, 'd MMM')}</span>
                </div>
                <p className="text-sm text-slate-600">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
