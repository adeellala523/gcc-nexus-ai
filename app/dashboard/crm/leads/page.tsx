import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Lead, LeadStatus } from '@/lib/types'
import { LeadsTable } from '@/components/crm/LeadsTable'
import { LeadForm } from '@/components/crm/LeadForm'

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

type SearchParams = { q?: string; status?: string; city?: string }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const lang = await getLang()
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common
  const sp = await searchParams

  const q = (sp.q ?? '').trim()
  const status = (sp.status ?? '').trim()
  const city = (sp.city ?? '').trim()

  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%`)
  if (status && (STATUSES as string[]).includes(status)) query = query.eq('status', status)
  if (city) query = query.ilike('city', `%${city}%`)

  const { data, error } = await query
  const leads = (data ?? []) as Lead[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gold-text text-2xl font-bold">{dict.leads}</h1>
          <p className="text-sm text-slate-400" dir="ltr">
            {leads.length}
          </p>
        </div>
        <LeadForm lang={lang} />
      </div>

      <form method="get" action="/dashboard/crm/leads" className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-slate-400">{common.search}</label>
          <input
            name="q"
            defaultValue={q}
            placeholder={`${dict.companyName} / ${dict.contactName}`}
            className="input-dark w-full rounded-xl px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">{common.status}</label>
          <select name="status" defaultValue={status} className="input-dark rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">{common.all}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.stages[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">{common.city}</label>
          <input
            name="city"
            defaultValue={city}
            className="input-dark rounded-xl px-3 py-2 text-sm outline-none"
          />
        </div>
        <button type="submit" className="btn-ghost rounded-xl px-4 py-2 text-sm">
          {dict.filter}
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error.message}</p>
      )}

      <LeadsTable leads={leads} lang={lang} />
    </div>
  )
}
