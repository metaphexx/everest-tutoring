import AdminShell from '@/components/portal/AdminShell'
import { requireUser } from '@/lib/session'
import SearchClient from './SearchClient'

export const metadata = { title: 'Search - Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminSearchPage() {
  await requireUser(['admin'])
  return (
    <AdminShell sub="Search">
      <h1 className="portal-title">Search</h1>
      <p className="portal-lede">Find any student, parent, tutor (by name, email or phone) or class - fast.</p>
      <div className="mt-5">
        <SearchClient />
      </div>
    </AdminShell>
  )
}
