'use client'

import { useState } from 'react'

// Confirm-then-delete button that calls a bound server action.
export function DeleteButton({
  onDelete,
  label,
  confirmText,
}: {
  onDelete: () => Promise<unknown>
  label: string
  confirmText: string
}) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(confirmText)) return
        setBusy(true)
        try {
          await onDelete()
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
    >
      {label}
    </button>
  )
}
