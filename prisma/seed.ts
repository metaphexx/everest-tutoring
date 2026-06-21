import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

async function main() {
  const term = await prisma.term.upsert({
    where: { id: 'term2-2026' },
    update: {},
    create: {
      id: 'term2-2026',
      name: 'Term 3 2026',
      year: 2026,
      termNumber: 3,
      startDate: new Date('2026-07-20'),
      endDate: new Date('2026-09-25'),
      weeks: 10,
      isActive: true,
    },
  })

  // Subject-specialist tutors - one per subject, teaches that subject across years.
  const tutorSeed = [
    { subject: 'Maths',   email: 'maths.tutor@everesttutoring.com.au',   name: 'Daniel Nguyen', phone: '+61400000001' },
    { subject: 'English', email: 'english.tutor@everesttutoring.com.au', name: 'Priya Sharma',   phone: '+61400000002' },
    { subject: 'Science', email: 'science.tutor@everesttutoring.com.au', name: 'James Okafor',   phone: '+61400000003' },
  ]
  const tutorBySubject: Record<string, string> = {}
  for (const t of tutorSeed) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, phone: t.phone, role: 'tutor' },
      create: { email: t.email, name: t.name, phone: t.phone, role: 'tutor' },
    })
    tutorBySubject[t.subject] = user.id
  }

  const subjects = [
    // Year 8 - purple #7C3AED
    { name: 'English', yearLevel: 8, dayOfWeek: 2, color: '#7C3AED' },
    { name: 'Maths',   yearLevel: 8, dayOfWeek: 3, color: '#7C3AED' },
    { name: 'Science', yearLevel: 8, dayOfWeek: 5, color: '#7C3AED' },
    // Year 9 - pink #EC4899
    { name: 'Maths',   yearLevel: 9, dayOfWeek: 1, color: '#EC4899' },
    { name: 'Science', yearLevel: 9, dayOfWeek: 2, color: '#EC4899' },
    { name: 'English', yearLevel: 9, dayOfWeek: 3, color: '#EC4899' },
    // Year 10 - green #22C55E
    { name: 'English', yearLevel: 10, dayOfWeek: 1, color: '#22C55E' },
    { name: 'Maths',   yearLevel: 10, dayOfWeek: 4, color: '#22C55E' },
    { name: 'Science', yearLevel: 10, dayOfWeek: 5, color: '#22C55E' },
  ]

  for (const s of subjects) {
    const tutorId = tutorBySubject[s.name]
    await prisma.subject.upsert({
      where: { id: `${s.yearLevel}-${s.name}-term2-2026` },
      update: { tutorId },
      create: {
        id: `${s.yearLevel}-${s.name}-term2-2026`,
        name: s.name,
        yearLevel: s.yearLevel,
        dayOfWeek: s.dayOfWeek,
        startTime: '15:15',
        endTime: '16:15',
        capacity: 12,
        color: s.color,
        termId: term.id,
        tutorId,
      },
    })
  }

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@everesttutoring.com.au' },
    update: {},
    create: {
      email: 'admin@everesttutoring.com.au',
      name: 'Everest Admin',
      role: 'admin',
    },
  })

  // HSHS partner (school) - read-only oversight portal
  await prisma.user.upsert({
    where: { email: 'partner@harrisdale.wa.edu.au' },
    update: { name: 'Harrisdale SHS', role: 'school' },
    create: { email: 'partner@harrisdale.wa.edu.au', name: 'Harrisdale SHS', role: 'school' },
  })

  // ---- Demo family + attendance so the dashboards render real content ----
  const parent = await prisma.user.upsert({
    where: { email: 'parent.demo@example.com' },
    update: { name: 'Sarah Thompson', phone: '+61400111222', role: 'parent' },
    create: { email: 'parent.demo@example.com', name: 'Sarah Thompson', phone: '+61400111222', role: 'parent' },
  })

  const alreadySeeded = await prisma.student.count({ where: { parentId: parent.id } })
  if (alreadySeeded === 0) {
    const booking = await prisma.booking.create({
      data: {
        userId: parent.id,
        termId: term.id,
        studentsCount: 2,
        subjectsPerWeek: 3,
        weeksRemaining: 4,
        totalAmountCents: 0,
        paymentStatus: 'paid',
        confirmationCode: 'EVDEMO1',
        paidAt: new Date('2026-04-21'),
      },
    })

    const emma = await prisma.student.create({ data: { firstName: 'Emma', lastName: 'Thompson', yearLevel: 9, parentId: parent.id } })
    const liam = await prisma.student.create({ data: { firstName: 'Liam', lastName: 'Thompson', yearLevel: 10, parentId: parent.id } })

    const enrol = (studentId: string, subjectId: string) =>
      prisma.enrollment.create({ data: { studentId, subjectId, bookingId: booking.id, status: 'active' } })
    await enrol(emma.id, '9-Maths-term2-2026')
    await enrol(emma.id, '9-English-term2-2026')
    await enrol(liam.id, '10-Science-term2-2026')

    // Most recent `n` past dates that fall on the given weekday (1=Mon … 5=Fri).
    const recentDates = (dayOfWeek: number, n: number): Date[] => {
      const out: Date[] = []
      const cur = new Date('2026-06-18T00:00:00')
      while (out.length < n) {
        cur.setDate(cur.getDate() - 1)
        const dow = cur.getDay() === 0 ? 7 : cur.getDay()
        if (dow === dayOfWeek) out.push(new Date(cur))
      }
      return out
    }
    const seedAttendance = async (studentId: string, subjectId: string, dow: number, tutorId: string, statuses: string[]) => {
      const dates = recentDates(dow, statuses.length)
      for (let i = 0; i < dates.length; i++) {
        await prisma.attendance.create({
          data: { studentId, subjectId, classDate: dates[i], status: statuses[i], markedById: tutorId },
        })
      }
    }
    await seedAttendance(emma.id, '9-Maths-term2-2026',   1, tutorBySubject.Maths,   ['present', 'present', 'late'])
    await seedAttendance(emma.id, '9-English-term2-2026', 3, tutorBySubject.English, ['present', 'absent', 'present'])
    await seedAttendance(liam.id, '10-Science-term2-2026', 5, tutorBySubject.Science, ['present', 'present', 'present'])

    await prisma.lessonNote.create({
      data: {
        subjectId: '9-Maths-term2-2026',
        classDate: recentDates(1, 1)[0],
        summary: 'Linear equations - solving for x and graphing y = mx + c. Worked through six exam-style questions together.',
        homework: 'Exercise 7B, questions 1–10, due next week.',
        authorId: tutorBySubject.Maths,
      },
    })

    // ── Student Learning Hub demo data ──
    // Each student gets their own login account, separate from the parent.
    const emmaAccount = await prisma.user.create({ data: { email: 'emma.demo@example.com', name: 'Emma Thompson', role: 'student', phone: '+61400222333' } })
    const liamAccount = await prisma.user.create({ data: { email: 'liam.demo@example.com', name: 'Liam Thompson', role: 'student', phone: '+61400222444' } })
    await prisma.student.update({ where: { id: emma.id }, data: { email: 'emma.demo@example.com', phone: '+61400222333', userId: emmaAccount.id, invitedAt: new Date() } })
    await prisma.student.update({ where: { id: liam.id }, data: { email: 'liam.demo@example.com', phone: '+61400222444', userId: liamAccount.id, invitedAt: new Date() } })

    // Emma uploads her Maths course outline; the tracker is built from it.
    const outline = await prisma.studentCourseOutline.create({ data: { studentId: emma.id, subject: 'Maths', school: 'Harrisdale SHS', term: term.name, extractionStatus: 'done', assessmentCount: 3 } })
    const assess: { title: string; kind: string; week: number }[] = [
      { title: 'Topic Test', kind: 'test', week: 5 },
      { title: 'Investigation', kind: 'investigation', week: 8 },
      { title: 'End of term exam', kind: 'exam', week: 10 },
    ]
    for (const a of assess) {
      const dueDate = new Date(term.startDate)
      dueDate.setDate(dueDate.getDate() + (a.week - 1) * 7)
      await prisma.studentAssessment.create({ data: { studentId: emma.id, outlineId: outline.id, subject: 'Maths', title: a.title, kind: a.kind, dueWeek: a.week, dueDate } })
    }

    // A solved question with a tutor reply, plus one shared with the class still waiting.
    const q1 = await prisma.question.create({ data: { studentId: emma.id, classId: '9-Maths-term2-2026', title: 'How do I factorise quadratics?', body: "I don't understand how to factorise x^2 + 5x + 6. Can you help?", visibility: 'private_to_tutor', status: 'tutor_replied', topic: 'Maths' } })
    await prisma.questionReply.create({ data: { questionId: q1.id, authorId: tutorBySubject.Maths, body: 'Find two numbers that multiply to 6 and add to 5 (2 and 3), so it factorises to (x+2)(x+3). Try x^2 + 7x + 12 next.', isTutor: true } })
    await prisma.question.create({ data: { studentId: emma.id, classId: '9-English-term2-2026', title: 'What should I revise for the essay?', body: 'I have a persuasive essay coming up. What should I focus on revising?', visibility: 'public_to_class', status: 'waiting_for_tutor', topic: 'English' } })

    // Tutor-posted content for the noticeboard.
    await prisma.tutorResource.create({ data: { title: 'Algebra practice booklet', subject: 'Maths', yearLevel: 9, classId: '9-Maths-term2-2026', fileType: 'booklet', weekNumber: 4, topic: 'Quadratics', uploadedByTutorId: tutorBySubject.Maths, visibleToStudents: true } })
    await prisma.tutorResource.create({ data: { title: 'Week 5 topic test - practice paper', subject: 'Maths', yearLevel: 9, classId: '9-Maths-term2-2026', fileType: 'practice_test', weekNumber: 5, topic: 'Linear & quadratics', uploadedByTutorId: tutorBySubject.Maths, visibleToStudents: true } })
    await prisma.announcement.create({ data: { classId: '9-Maths-term2-2026', authorId: tutorBySubject.Maths, pinned: true, body: 'Great work this week, everyone. Remember the topic test is in Week 5 - bring your practice booklets and we will run through past questions on Monday.' } })
    await prisma.announcement.create({ data: { classId: '9-Maths-term2-2026', authorId: tutorBySubject.Maths, body: 'I have uploaded the algebra practice booklet to Resources. Try questions 1-10 before next class.' } })

    // A classmate in Emma's Maths class who shares a question, so the class board
    // and the "From your class" feed have peer activity to interact with.
    const noah = await prisma.student.create({ data: { firstName: 'Noah', lastName: 'Patel', yearLevel: 9, parentId: parent.id } })
    await prisma.enrollment.create({ data: { studentId: noah.id, subjectId: '9-Maths-term2-2026', bookingId: booking.id, status: 'active' } })
    const sharedQ = await prisma.question.create({ data: { studentId: noah.id, classId: '9-Maths-term2-2026', title: 'How do you solve simultaneous equations?', body: 'I keep getting stuck on the substitution method for simultaneous equations. Does anyone get it?', visibility: 'public_to_class', status: 'waiting_for_tutor', topic: 'Maths' } })
    await prisma.questionReply.create({ data: { questionId: sharedQ.id, authorId: emmaAccount.id, body: 'I found it helps to label one equation and substitute it into the other. Happy to show you before class.', isTutor: false } })

    // A monitored student-to-tutor chat.
    const studentConv = await prisma.conversation.create({ data: { type: 'student', parentId: parent.id, tutorId: tutorBySubject.Maths, subjectId: '9-Maths-term2-2026', studentId: emma.id } })
    await prisma.message.create({ data: { conversationId: studentConv.id, senderId: emmaAccount.id, body: 'Hi, can I get some extra practice on factorising before our next class?' } })
  }

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
