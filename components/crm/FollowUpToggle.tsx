'use client'

import { useState } from 'react'
import { toggleFollowUp } from '@/app/dashboard/crm/actions'

// Done checkbox for a follow-up row. Calls toggleFollowUp optimistically.
export function FollowUpToggle({ id, done }: { id: string; done: boolean }) {
  const [checked, setChecked] = useState(done)
  const [busy, setBusy] = useState(false)

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={busy}
      onChange={async (e) => {
        const next = e.target.checked
        setChecked(next)
        setBusy(true)
        try {
          await toggleFollowUp(id, next)
        } catch {
          setChecked(!next)
        } finally {
          setBusy(false)
        }
      }}
      className="h-5 w-5 shrink-0 cursor-pointer accent-[#d4af37]"
      aria-label="toggle done"
    />
  )
}
