import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Customer, Deal } from '@/lib/types'
import { deleteCustomer } from '@/app/dashboard/crm/actions'
import { CustomerForm } from '@/components/crm/CustomerForm'
import { DeleteButton } from '@/components/crm/DeleteButton'

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

export default async function CustomersPage() {
  const lang = await getLang()
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common

  const supabase = await createClient()
  const [{ data: customerRows, error }, { data: dealRows }] = await Promise.all([
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('deals').select('id, customer_id'),
  ])

  const customers = (customerRows ?? []) as Customer[]
  const deals = (dealRows ?? []) as Pick<Deal, 'id' | 'customer_id'>[]
  const dealCount = new Map<string, number>()
  for (const d of deals) {
    if (d.customer_id) dealCount.set(d.customer_id, (dealCount.get(d.customer_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gold-text text-2xl font-bold">{dict.customers}</h1>
        <CustomerForm lang={lang} />
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error.message}</p>
      )}

      {customers.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-slate-400">
          {dictionaries[lang].dashboard.noData}
        </div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 text-start font-medium">{dict.customerName}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.companyName}</th>
                <th className="px-4 py-3 text-start font-medium">{common.email}</th>
                <th className="px-4 py-3 text-start font-medium">{common.phone}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.newDeal}s</th>
                <th className="px-4 py-3 text-start font-medium">{common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-semibold text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-300">{c.company ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300" dir="ltr">
                    {c.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300" dir="ltr">
                    {c.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300" dir="ltr">
                    {dealCount.get(c.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CustomerForm lang={lang} customer={c} />
                      <DeleteButton
                        onDelete={() => deleteCustomer(c.id)}
                        label={common.delete}
                        confirmText={dict.confirmDelete}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
