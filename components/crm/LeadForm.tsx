'use client'

import { useActionState, useEffect, useState } from 'react'
import { createLead, type ActionResult } from '@/app/dashboard/crm/actions'
import { dictionaries, type Lang } from '@/lib/i18n'

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const

function LeadFormBody({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => createLead(fd),
    { ok: false }
  )

  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  const input =
    'input-dark w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:text-slate-500'
  const label = 'mb-1 block text-xs text-slate-400'

  return (
    <div className="glass w-full max-w-lg animate-fade-up rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="gold-text text-lg font-bold">{dict.addLead}</h2>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-3 py-1 text-sm">
          {common.close}
        </button>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>{dict.companyName} *</label>
          <input name="company_name" required maxLength={120} className={input} />
        </div>
        <div>
          <label className={label}>{dict.contactName}</label>
          <input name="contact_name" maxLength={120} className={input} />
        </div>
        <div>
          <label className={label}>{common.industry}</label>
          <input name="industry" maxLength={80} className={input} />
        </div>
        <div>
          <label className={label}>{common.email}</label>
          <input name="email" type="email" maxLength={160} className={input} dir="ltr" />
        </div>
        <div>
          <label className={label}>{common.phone}</label>
          <input name="phone" type="tel" maxLength={40} className={input} dir="ltr" />
        </div>
        <div>
          <label className={label}>{common.city}</label>
          <input name="city" maxLength={80} className={input} />
        </div>
        <div>
          <label className={label}>{common.country}</label>
          <select name="country" className={input} defaultValue="">
            <option value="">—</option>
            <option value="AE">UAE</option>
            <option value="SA">KSA</option>
          </select>
        </div>
        <div>
          <label className={label}>{common.status}</label>
          <select name="status" className={input} defaultValue="new">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.stages[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{dict.score}</label>
          <input name="score" type="number" min={0} max={100} defaultValue={0} className={input} dir="ltr" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{common.notes}</label>
          <textarea name="notes" rows={3} maxLength={2000} className={input} placeholder={dict.notesPlaceholder} />
        </div>

        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">
            {common.cancel}
          </button>
          <button type="submit" disabled={pending} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">
            {pending ? common.loading : common.add}
          </button>
        </div>
      </form>
    </div>
  )
}

// Modal with the new-lead form. Posts to the createLead server action via
// useActionState; closes on success, shows the returned error otherwise.
// The body is keyed per open so the action state resets each time it opens.
export function LeadForm({ lang }: { lang: Lang }) {
  const dict = dictionaries[lang].crm
  const [open, setOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenCount((n) => n + 1)
          setOpen(true)
        }}
        className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold"
      >
        + {dict.newLead}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <LeadFormBody key={openCount} lang={lang} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
