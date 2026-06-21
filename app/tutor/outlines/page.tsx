import Link from 'next/link'
import { ArrowLeft, FileText, ExternalLink, CalendarDays } from 'lucide-react'
import { format, startOfDay } from 'date-fns'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import PortalShell from '@/components/portal/PortalShell'
import { parseTopics } from '@/lib/outline'

export const metadata = { title: 'Course outlines' }
export const dynamic = 'force-dynamic'

const isPdf = (url: string | null) => !!url && /\.pdf(\?|#|$)/i.test(url)

export default async function TutorOutlinesPage() {
  const user = await requireUser(['tutor'])

  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, tutorId: user.id },
    select: { name: true, yearLevel: true },
  })
  const keys = new Set(subjects.map((s) => `${s.yearLevel}-${s.name}`))

  const outlines = (
    await prisma.courseOutline.findMany({ where: { status: 'scanned' }, orderBy: { createdAt: 'desc' } })
  ).filter((o) => keys.has(`${o.yearLevel}-${o.subject}`))

  const assessments = await prisma.assessmentDate.findMany({
    where: { date: { gte: startOfDay(new Date()) } },
    orderBy: { date: 'asc' },
  })

  return (
    <PortalShell eyebrow="Tutor" sub="Course outlines" user={user}>
      <Link href="/tutor" className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <ArrowLeft size={15} /> Back
      </Link>
      <h1 className="portal-title">Course outlines</h1>
      <p className="portal-lede">The actual HSHS outlines for your classes - read the source document and the topics + assessments the AI pulled out.</p>

      {outlines.length === 0 ? (
        <div className="glass-card glass-card-pad mt-5">
          <p className="text-sm text-slate-500">No course outlines uploaded for your classes yet. HSHS or the admin team can upload them.</p>
        </div>
      ) : (
        <div className="space-y-5 mt-5">
          {outlines.map((o) => {
            const topics = parseTopics(o.topics)
            const subjectAssessments = assessments.filter((a) => a.subject === o.subject && a.yearLevel === o.yearLevel)
            return (
              <div key={o.id} className="glass-card glass-card-pad">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={17} style={{ color: '#0D9488' }} />
                  <h2 className="portal-section-title">Y{o.yearLevel} {o.subject}</h2>
                  {o.sourceUrl && (
                    <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-semibold text-primary inline-flex items-center gap-1">
                      Open full PDF <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                {o.fileName && <p className="text-xs text-slate-400 mb-3">{o.fileName}</p>}

                <div className="grid lg:grid-cols-2 gap-4">
                  {/* The document itself */}
                  <div>
                    {isPdf(o.sourceUrl) ? (
                      <iframe
                        src={`${encodeURI(o.sourceUrl as string)}#view=FitH`}
                        title={`Y${o.yearLevel} ${o.subject} course outline`}
                        className="w-full rounded-xl border"
                        style={{ height: 420, borderColor: 'rgba(15,42,79,.12)', background: '#fff' }}
                      />
                    ) : (
                      <div className="rounded-xl border p-4 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed" style={{ height: 420, overflowY: 'auto', borderColor: 'rgba(15,42,79,.12)', background: 'rgba(255,255,255,.6)' }}>
                        {o.rawText || 'No document text available.'}
                      </div>
                    )}
                  </div>

                  {/* What the AI pulled out */}
                  <div className="space-y-3">
                    {o.scanSummary && <p className="text-sm text-slate-600">{o.scanSummary}</p>}
                    {subjectAssessments.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5"><CalendarDays size={14} className="text-primary" /><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessments</p></div>
                        <div className="space-y-1.5">
                          {subjectAssessments.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-dark flex-1 min-w-0 truncate">{a.title}</span>
                              <span className="text-xs text-primary font-medium flex-shrink-0">{format(a.date, 'EEE d MMM')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {topics.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Weekly topics</p>
                        <ol className="space-y-1 text-sm text-slate-600">
                          {topics.map((t, i) => (
                            <li key={i}>{t.week != null ? <span className="font-semibold text-dark">W{t.week}: </span> : null}{t.topic}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PortalShell>
  )
}
