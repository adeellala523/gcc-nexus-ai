import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Customer, Deal } from '@/lib/types'
import { createDeal, deleteDeal } from '@/app/dashboard/crm/actions'
import { PipelineBoard, type BoardLead } from '@/components/crm/PipelineBoard'
import { DealStageSelect } from '@/components/crm/DealStageSelect'
import { DeleteButton } from '@/components/crm/DeleteButton'

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

export default async function PipelinePage() {
  const lang = await getLang()
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common

  const supabase = await createClient()
  const [{ data: leadRows }, { data: dealRows }, { data: customerRows }] = await Promise.all([
    supabase.from('leads').select('id, company_name, contact_name, score, status').order('created_at', { ascending: false }),
    supabase.from('deals').select('*').order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').order('name'),
  ])

  const leads = (leadRows ?? []) as BoardLead[]
  const deals = (dealRows ?? []) as Deal[]
  const customers = (customerRows ?? []) as Pick<Customer, 'id' | 'name'>[]
  const customerName = new Map(customers.map((c) => [c.id, c.name]))

  const input = 'input-dark rounded-xl px-3 py-2 text-sm outline-none'
  const label = 'mb-1 block text-xs text-slate-400'

  return (
    <div className="space-y-8">
      <h1 className="gold-text text-2xl font-bold">{dict.pipeline}</h1>

      <PipelineBoard initialLeads={leads} lang={lang} />

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100">
          {dict.newDeal} / {common.all}
        </h2>

        <form action={async (fd: FormData) => { await createDeal(fd) }} className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
          <div className="min-w-[180px] flex-1">
            <label className={label}>{dict.dealTitle} *</label>
            <input name="title" required maxLength={160} className={`${input} w-full`} />
          </div>
          <div>
            <label className={label}>{dict.selectCustomer}</label>
            <select name="customer_id" defaultValue="" className={input}>
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{dict.value}</label>
            <input name="value" type="number" min={0} step="any" defaultValue={0} className={`${input} w-32`} dir="ltr" />
          </div>
          <div>
            <label className={label}>{dict.currency}</label>
            <select name="currency" defaultValue="AED" className={input}>
              <option value="AED">AED</option>
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className={label}>{dict.probability} %</label>
            <input name="probability" type="number" min={0} max={100} defaultValue={10} className={`${input} w-24`} dir="ltr" />
          </div>
          <button type="submit" className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">
            {common.add}
          </button>
        </form>

        {deals.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-slate-400">
            {dictionaries[lang].dashboard.noData}
          </div>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 text-start font-medium">{dict.dealTitle}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.customers}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.value}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.stage}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.probability}</th>
                  <th className="px-4 py-3 text-start font-medium">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-slate-100">{deal.title}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {deal.customer_id ? customerName.get(deal.customer_id) ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-200" dir="ltr">
                      {Number(deal.value).toLocaleString()} {deal.currency}
                    </td>
                    <td className="px-4 py-3">
                      <DealStageSelect id={deal.id} stage={deal.stage} lang={lang} />
                    </td>
                    <td className="px-4 py-3 text-slate-300" dir="ltr">
                      {deal.probability}%
                    </td>
                    <td className="px-4 py-3">
                      <DeleteButton
                        onDelete={() => deleteDeal(deal.id)}
                        label={common.delete}
                        confirmText={dict.confirmDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
