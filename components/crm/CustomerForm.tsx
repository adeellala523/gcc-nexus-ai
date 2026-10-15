'use client'

import { useActionState, useEffect, useState } from 'react'
import { createCustomer, updateCustomer, type ActionResult } from '@/app/dashboard/crm/actions'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Customer } from '@/lib/types'

function CustomerFormBody({
  lang,
  customer,
  onClose,
}: {
  lang: Lang
  customer?: Customer
  onClose: () => void
}) {
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common

  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => action(fd),
    { ok: false }
  )

  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  const input = 'input-dark w-full rounded-xl px-3 py-2 text-sm outline-none'
  const label = 'mb-1 block text-xs text-slate-400'

  return (
    <div className="glass w-full max-w-lg animate-fade-up rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="gold-text text-lg font-bold">{customer ? common.edit : dict.newCustomer}</h2>
        <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-3 py-1 text-sm">
          {common.close}
        </button>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>{dict.customerName} *</label>
          <input name="name" required maxLength={120} defaultValue={customer?.name ?? ''} className={input} />
        </div>
        <div>
          <label className={label}>{common.email}</label>
          <input name="email" type="email" maxLength={160} defaultValue={customer?.email ?? ''} className={input} dir="ltr" />
        </div>
        <div>
          <label className={label}>{common.phone}</label>
          <input name="phone" type="tel" maxLength={40} defaultValue={customer?.phone ?? ''} className={input} dir="ltr" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{dict.companyName}</label>
          <input name="company" maxLength={120} defaultValue={customer?.company ?? ''} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{common.notes}</label>
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={customer?.notes ?? ''} placeholder={dict.notesPlaceholder} className={input} />
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
            {pending ? common.loading : common.save}
          </button>
        </div>
      </form>
    </div>
  )
}

// Add/edit customer modal. Edit mode when `customer` is provided.
// The body is keyed per open so the action state resets each time it opens.
export function CustomerForm({
  lang,
  customer,
  triggerLabel,
}: {
  lang: Lang
  customer?: Customer
  triggerLabel?: string
}) {
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common
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
        className={
          customer
            ? 'btn-ghost rounded-lg px-3 py-1.5 text-xs'
            : 'btn-gold rounded-xl px-4 py-2 text-sm font-semibold'
        }
      >
        {triggerLabel ?? (customer ? common.edit : `+ ${dict.newCustomer}`)}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <CustomerFormBody
            key={openCount}
            lang={lang}
            customer={customer}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  )
}
