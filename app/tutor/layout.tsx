import { redirect } from 'next/navigation'
import { getCurrentUser, homeForRole } from '@/lib/session'

// Tutor workspace is for tutors only - admins have their own oversight in /admin.
export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'tutor') redirect(homeForRole(user.role))
  return <>{children}</>
}
