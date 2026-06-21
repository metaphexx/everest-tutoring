'use client'

import { List, CalendarDays } from 'lucide-react'
import AssessmentCalendar, { type CalItem } from './AssessmentCalendar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

const YEAR_COLORS: Record<number, string> = { 8: '#7C3AED', 9: '#EC4899', 10: '#22C55E' }

export default function AssessmentView({ assessments }: { assessments: CalItem[] }) {
  return (
    <Tabs defaultValue="list">
      <TabsList className="mb-3">
        <TabsTrigger value="list"><List size={13} /> List</TabsTrigger>
        <TabsTrigger value="calendar"><CalendarDays size={13} /> Calendar</TabsTrigger>
      </TabsList>

      {assessments.length === 0 ? (
        <p className="text-sm text-slate-400">No upcoming assessments shared.</p>
      ) : (
        <>
          <TabsContent value="list">
            <div className="space-y-2">
              {assessments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.5)' }}>
                  <Badge size="sm" className="text-white" style={{ background: YEAR_COLORS[a.yearLevel] ?? '#009dff' }}>Y{a.yearLevel}</Badge>
                  <p className="flex-1 min-w-0 text-sm font-medium text-dark truncate">{a.subject}: {a.title}</p>
                  <span className="text-xs font-medium text-primary flex-shrink-0">{new Date(a.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="calendar">
            <AssessmentCalendar assessments={assessments} />
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}
