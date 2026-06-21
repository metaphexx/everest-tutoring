import { redirect } from 'next/navigation'
import { requireUser, homeForRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Post-login hub: sends each user to the area for their role.
export default async function AccountPage() {
  const user = await requireUser()
  redirect(homeForRole(user.role))
}
