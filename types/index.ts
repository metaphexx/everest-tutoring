export type YearLevel = 8 | 9 | 10
export type SubjectName = 'English' | 'Maths' | 'Science'
export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export interface ClassSlot {
  subject: SubjectName
  yearLevel: YearLevel
  day: DayName
  dayOfWeek: number // 1=Mon…5=Fri
  startTime: string
  endTime: string
  color: string
  capacity: number
  enrolled: number
}

export interface StudentFormData {
  firstName: string
  lastName: string
  yearLevel: YearLevel
  // The student's own contact details, used to give them their Learning Hub login
  // (separate from the parent account). Optional: falls back to the parent.
  email?: string
  phone?: string
  selectedSubjects: SubjectName[]
}

export interface BookingFormData {
  // parent
  parentFirstName: string
  parentLastName: string
  email: string
  phone: string
  // students
  students: StudentFormData[]
}

export interface PricingSummary {
  subjectsPerStudent: number
  weeksRemaining: number
  weeklyRate: number
  perStudentTotal: number
  studentsCount: number
  subtotal: number
  siblingDiscount: number
  total: number
  totalCents: number
}

export interface BookingStep {
  id: number
  label: string
}
