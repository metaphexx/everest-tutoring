'use client'

import { useState, useTransition } from 'react'
import { Mail, MessageSquare } from 'lucide-react'
import { setNotifPrefs } from './actions'

// Note: we store opt-OUT flags in the DB but show opt-IN toggles to the parent.
export default function NotifPrefs({ initialEmailOptOut, initialSmsOptOut }: { initialEmailOptOut: boolean; initialSmsOptOut: boolean }) {
  const [emailOn, setEmailOn] = useState(!initialEmailOptOut)
  const [smsOn, setSmsOn] = useState(!initialSmsOptOut)
  const [, startTransition] = useTransition()

  function persist(nextEmailOn: boolean, nextSmsOn: boolean) {
    startTransition(async () => {
      try {
        await setNotifPrefs({ emailOptOut: !nextEmailOn, smsOptOut: !nextSmsOn })
      } catch {
        // revert on failure
        setEmailOn(!initialEmailOptOut)
        setSmsOn(!initialSmsOptOut)
      }
    })
  }

  const rows: { on: boolean; set: (v: boolean) => void; Icon: typeof Mail; label: string; desc: string }[] = [
    { on: emailOn, set: setEmailOn, Icon: Mail, label: 'Email', desc: 'Reminders, reports & receipts' },
    { on: smsOn, set: setSmsOn, Icon: MessageSquare, label: 'SMS', desc: 'Class reminders & absence alerts' },
  ]

  return (
    <div className="space-y-3">
      {rows.map(({ on, set, Icon, label, desc }) => (
        <div key={label} className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,157,255,.1)', color: '#009dff' }}
          >
            <Icon size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark leading-tight">{label}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`${label} notifications`}
            onClick={() => {
              const next = !on
              set(next)
              persist(label === 'Email' ? next : emailOn, label === 'SMS' ? next : smsOn)
            }}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: on ? '#009dff' : '#cbd5e1' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: on ? '22px' : '2px' }}
            />
          </button>
        </div>
      ))}
    </div>
  )
}
