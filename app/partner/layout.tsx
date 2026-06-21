import { requireUser } from '@/lib/session'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requireUser(['school'])
  return <>{children}</>
}
