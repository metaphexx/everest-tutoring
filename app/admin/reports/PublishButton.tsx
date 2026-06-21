'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setReportPublished } from '@/app/reports/actions'
import { Button } from '@/components/ui/button'

export default function PublishButton({ id, published }: { id: string; published: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  function toggle() {
    start(async () => {
      await setReportPublished({ id, published: !published })
      router.refresh()
    })
  }
  return (
    <Button size="sm" variant={published ? 'secondary' : 'default'} onClick={toggle} disabled={pending}>
      {pending ? '…' : published ? 'Unpublish' : 'Publish'}
    </Button>
  )
}
