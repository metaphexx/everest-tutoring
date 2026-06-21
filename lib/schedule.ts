import type { ClassSlot, YearLevel, DayName } from '@/types'

export const YEAR_LEVEL_COLORS: Record<YearLevel, string> = {
  8:  '#7C3AED', // purple
  9:  '#EC4899', // pink
  10: '#22C55E', // green
}

export const YEAR_LEVEL_BG: Record<YearLevel, string> = {
  8:  'bg-purple-100 text-purple-700 border-purple-200',
  9:  'bg-pink-100 text-pink-700 border-pink-200',
  10: 'bg-green-100 text-green-700 border-green-200',
}

export const DAY_NAMES: DayName[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
]

export const SCHEDULE: ClassSlot[] = [
  // Year 8
  { subject: 'English', yearLevel: 8, day: 'Tuesday',   dayOfWeek: 2, startTime: '3:15pm', endTime: '4:15pm', color: '#7C3AED', capacity: 12, enrolled: 0 },
  { subject: 'Maths',   yearLevel: 8, day: 'Wednesday',  dayOfWeek: 3, startTime: '3:15pm', endTime: '4:15pm', color: '#7C3AED', capacity: 12, enrolled: 0 },
  { subject: 'Science', yearLevel: 8, day: 'Friday',    dayOfWeek: 5, startTime: '3:15pm', endTime: '4:15pm', color: '#7C3AED', capacity: 12, enrolled: 0 },
  // Year 9
  { subject: 'Maths',   yearLevel: 9, day: 'Monday',    dayOfWeek: 1, startTime: '3:15pm', endTime: '4:15pm', color: '#EC4899', capacity: 12, enrolled: 0 },
  { subject: 'Science', yearLevel: 9, day: 'Tuesday',   dayOfWeek: 2, startTime: '3:15pm', endTime: '4:15pm', color: '#EC4899', capacity: 12, enrolled: 0 },
  { subject: 'English', yearLevel: 9, day: 'Wednesday',  dayOfWeek: 3, startTime: '3:15pm', endTime: '4:15pm', color: '#EC4899', capacity: 12, enrolled: 0 },
  // Year 10
  { subject: 'English', yearLevel: 10, day: 'Monday',   dayOfWeek: 1, startTime: '3:15pm', endTime: '4:15pm', color: '#22C55E', capacity: 12, enrolled: 0 },
  { subject: 'Maths',   yearLevel: 10, day: 'Thursday', dayOfWeek: 4, startTime: '3:15pm', endTime: '4:15pm', color: '#22C55E', capacity: 12, enrolled: 0 },
  { subject: 'Science', yearLevel: 10, day: 'Friday',   dayOfWeek: 5, startTime: '3:15pm', endTime: '4:15pm', color: '#22C55E', capacity: 12, enrolled: 0 },
]

export function getScheduleForYear(yearLevel: YearLevel): ClassSlot[] {
  return SCHEDULE.filter(s => s.yearLevel === yearLevel)
}

export function getScheduleByDay(): Record<DayName, ClassSlot[]> {
  const result: Record<DayName, ClassSlot[]> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
  }
  for (const slot of SCHEDULE) {
    result[slot.day].push(slot)
  }
  return result
}
