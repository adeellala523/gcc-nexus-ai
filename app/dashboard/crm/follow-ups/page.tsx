import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { FollowUp } from '@/lib/types'
import { FollowUpToggle } from '@/components/crm/FollowUpToggle'

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

type FollowUpWithLead = FollowUp & { leads: { company_name: string } | null }

const TABS = ['open', 'done', 'all'] as const
type Tab = (typeof TABS)[number]

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const lang = await getLang()
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common
  const sp = await searchParams

  const show: Tab = TABS.includes(sp.show as Tab) ? (sp.show as Tab) : 'open'

  const supabase = await createClient()
  let query = supabase
    .from('follow_ups')
    .select('*, leads(company_name)')
    .order('due_at', { ascending: true })

  if (show === 'open') query = query.eq('done', false)
  if (show === 'done') query = query.eq('done', true)

  const { data, error } = await query
  const rows = (data ?? []) as FollowUpWithLead[]

  const now = Date.now()
  const tabLabel: Record<Tab, string> = { open: dict.open, done: dict.done, all: common.all }

  return (
    <div className="space-y-6">
      <h1 className="gold-text text-2xl font-bold">{dict.followUps}</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/dashboard/crm/follow-ups?show=${t}`}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              show === t ? 'btn-gold' : 'btn-ghost'
            }`}
          >
            {tabLabel[t]}
          </Link>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error.message}</p>
      )}

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-slate-400">
          {dictionaries[lang].dashboard.noData}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((fu) => {
            const overdue = !fu.done && new Date(fu.due_at).getTime() < now
            return (
              <li
                key={fu.id}
                className={`glass flex items-start gap-3 rounded-2xl p-4 ${
                  overdue ? 'ring-1 ring-rose-500/40' : ''
                }`}
              >
                <FollowUpToggle id={fu.id} done={fu.done} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {fu.lead_id && fu.leads ? (
                      <Link
                        href={`/dashboard/crm/leads/${fu.lead_id}`}
                        className="font-semibold text-gold hover:underline"
                      >
                        {fu.leads.company_name}
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                    <span className="text-xs text-slate-400" dir="ltr">
                      {dict.dueOn}: {new Date(fu.due_at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
                    </span>
                    {overdue && (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
                        {dict.overdue}
                      </span>
                    )}
                  </div>
                  {fu.note && (
                    <p className={`mt-1 text-sm ${fu.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {fu.note}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
