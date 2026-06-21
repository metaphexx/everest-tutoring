'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { autoDraftTermReports } from './actions'

export default function AutoDraftButton() {
  const router = useRouter()
  const [pending, start] = useTransition()

  function run() {
    start(async () => {
      const r = await autoDraftTermReports()
      toast.success(
        `Drafted ${r.created} report${r.created === 1 ? '' : 's'} for ${r.termName}${r.skipped ? `, skipped ${r.skipped} already drafted` : ''}.`,
        { description: r.live ? 'Review and publish each one.' : 'Preview drafts - add an API key for AI-written comments.' },
      )
      router.refresh()
    })
  }

  return (
    <Button variant="brand" onClick={run} disabled={pending}>
      <Sparkles size={15} className={pending ? 'animate-pulse' : ''} /> {pending ? 'Drafting…' : 'Auto-draft term reports'}
    </Button>
  )
}
