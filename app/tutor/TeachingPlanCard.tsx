import { BookOpen, Target, ClipboardCheck, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { TeachingPlan } from '@/lib/teaching'

// Presentational: shows Elliot's "what to teach this week" plan for one class,
// built from the scanned course outline + assessment calendar + materials drive.
export default function TeachingPlanCard({
  subjectName,
  yearLevel,
  color,
  plan,
}: {
  subjectName: string
  yearLevel: number
  color: string
  plan: TeachingPlan
}) {
  return (
    <div className="glass-card glass-card-pad">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: color }}>Y{yearLevel}</span>
        <h3 className="font-display font-bold text-dark">{subjectName}</h3>
        {plan.weekOfTerm != null && <Badge variant="neutral" size="sm" className="ml-auto">Week {plan.weekOfTerm}</Badge>}
      </div>

      {!plan.hasOutline ? (
        <p className="text-sm text-slate-500">No course outline scanned for this class yet. Once HSHS uploads one, suggested topics and prac will appear here.</p>
      ) : (
        <div className="space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <BookOpen size={15} className="mt-0.5 flex-shrink-0" style={{ color }} />
            <p className="text-slate-700">
              <span className="font-semibold text-dark">Teach this week: </span>
              {plan.topic ? plan.topic.topic : 'Continue the current unit (no specific week topic in the outline).'}
              {plan.topic?.focus ? ` - ${plan.topic.focus}` : ''}
            </p>
          </div>

          {plan.nextAssessment && (
            <div className="flex items-start gap-2">
              <Target size={15} className="mt-0.5 flex-shrink-0 text-pink-500" />
              <p className="text-slate-700">
                <span className="font-semibold text-dark">Next assessment: </span>
                {plan.nextAssessment.title} on {format(plan.nextAssessment.date, 'EEE d MMM')}
              </p>
            </div>
          )}

          {plan.suggestedPrac && (
            <div className="flex items-start gap-2">
              <ClipboardCheck size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <p className="text-slate-700"><span className="font-semibold text-dark">Suggested prac: </span>{plan.suggestedPrac}</p>
            </div>
          )}

          {plan.materials.length > 0 && (
            <div className="flex items-start gap-2">
              <Printer size={15} className="mt-0.5 flex-shrink-0 text-teal-600" />
              <div className="text-slate-700">
                <span className="font-semibold text-dark">Print this week: </span>
                <ul className="mt-1 space-y-1">
                  {plan.materials.map((m, i) => (
                    <li key={i} className="text-slate-600">
                      {m.driveUrl ? (
                        <a href={m.driveUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium">{m.title}</a>
                      ) : (
                        <span className="font-medium text-slate-700">{m.title}</span>
                      )}
                      <span className="text-xs text-slate-400"> - {m.reason}</span>
                    </li>
                  ))}
                </ul>
                {plan.materials.some((m) => m.source === 'suggested') && (
                  <p className="text-[11px] text-slate-400 mt-1">Suggestions shown. Connect the booklet Drive to link the actual files to print.</p>
                )}
              </div>
            </div>
          )}

          {plan.upcomingTopics.length > 0 && (
            <p className="text-xs text-slate-400">Coming up: {plan.upcomingTopics.map((t) => t.topic).join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
