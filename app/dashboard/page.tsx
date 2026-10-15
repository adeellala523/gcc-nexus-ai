import { cookies } from 'next/headers'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Lead, LeadStatus } from '@/lib/types'
import LeadsBarChart from '@/components/charts/LeadsBarChart'

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const BADGE_STYLES: Record<LeadStatus, string> = {
  new: 'border-sky-400/30 bg-sky-500/15 text-sky-300',
  contacted: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  qualified: 'border-violet-400/30 bg-violet-500/15 text-violet-300',
  proposal: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
  won: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  lost: 'border-rose-400/30 bg-rose-500/15 text-rose-300',
}

type RecentLead = Pick<
  Lead,
  'id' | 'company_name' | 'city' | 'status' | 'score' | 'created_at'
>

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

export default async function DashboardPage() {
  const lang = await getLang()
  const dict = dictionaries[lang]
  const supabase = await createClient()

  // All queries are tenant-scoped by RLS on the server client.
  const [totalRes, wonRes, dealsRes, campaignsRes, statusRes, recentRes] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'won'),
      supabase.from('deals').select('value').not('stage', 'in', '(won,lost)'),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase.from('leads').select('status'),
      supabase
        .from('leads')
        .select('id, company_name, city, status, score, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const totalLeads = totalRes.count ?? 0
  const wonLeads = wonRes.count ?? 0
  const conversion = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
  const pipelineValue = ((dealsRes.data ?? []) as { value: number | null }[]).reduce(
    (sum, d) => sum + (d.value ?? 0),
    0
  )
  const activeCampaigns = campaignsRes.count ?? 0

  const statuses = ((statusRes.data ?? []) as { status: string }[]).map((l) => l.status)
  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: statuses.filter((s) => s === status).length,
  }))

  const recentLeads = (recentRes.data ?? []) as RecentLead[]

  // Currency label for the pipeline value comes from the tenant's country.
  const session = await getSessionUser()
  let currency = 'AED'
  if (session?.profile) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('country')
      .eq('id', session.profile.tenant_id)
      .maybeSingle()
    if ((tenant as { country?: string } | null)?.country === 'SA') currency = 'SAR'
  }

  const stats = [
    { label: dict.dashboard.totalLeads, value: totalLeads.toLocaleString() },
    { label: dict.dashboard.conversionRate, value: `${conversion}%` },
    {
      label: dict.dashboard.pipelineValue,
      value: `${pipelineValue.toLocaleString()} ${currency}`,
    },
    { label: dict.dashboard.activeCampaigns, value: activeCampaigns.toLocaleString() },
  ]

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">{dict.dashboard.subtitle}</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="glass rounded-2xl p-5 animate-fade-up relative overflow-hidden"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {s.label}
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold gold-text truncate">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + recent leads */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div
          className="glass rounded-2xl p-5 sm:p-6 lg:col-span-3 animate-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <h2 className="font-bold mb-4">{dict.dashboard.leadsByStatus}</h2>
          {totalLeads > 0 ? (
            <div className="h-64 sm:h-72" dir="ltr">
              <LeadsBarChart data={byStatus} lang={lang} />
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-10 text-center">{dict.dashboard.noData}</p>
          )}
        </div>

        <div
          className="glass rounded-2xl p-5 sm:p-6 lg:col-span-2 animate-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <h2 className="font-bold mb-2">{dict.dashboard.recentLeads}</h2>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">{dict.dashboard.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-white/10">
                    <th className="text-start font-medium py-2 pe-3">{dict.crm.companyName}</th>
                    <th className="text-start font-medium py-2 pe-3 hidden md:table-cell">
                      {dict.common.city}
                    </th>
                    <th className="text-start font-medium py-2 pe-3">{dict.common.status}</th>
                    <th className="text-start font-medium py-2">{dict.crm.score}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pe-3 font-medium truncate max-w-[10rem]">
                        {lead.company_name}
                      </td>
                      <td className="py-2.5 pe-3 text-slate-400 hidden md:table-cell">
                        {lead.city ?? '—'}
                      </td>
                      <td className="py-2.5 pe-3">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            BADGE_STYLES[lead.status] ?? BADGE_STYLES.new
                          }`}
                        >
                          {dict.crm.stages[lead.status]}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full bg-gold"
                              style={{
                                width: `${Math.min(100, Math.max(0, lead.score))}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{lead.score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
