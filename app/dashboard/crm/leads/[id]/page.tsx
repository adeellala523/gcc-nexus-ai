import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { FollowUp, Lead } from '@/lib/types'
import { createFollowUp, updateLead } from '@/app/dashboard/crm/actions'
import { FollowUpToggle } from '@/components/crm/FollowUpToggle'

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const lang = await getLang()
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common
  const { id } = await params

  const supabase = await createClient()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (!lead) notFound()
  const leadRow = lead as Lead

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('lead_id', id)
    .order('due_at', { ascending: true })
  const followUpRows = (followUps ?? []) as FollowUp[]

  const now = Date.now()
  const input = 'input-dark w-full rounded-xl px-3 py-2 text-sm outline-none'
  const label = 'mb-1 block text-xs text-slate-400'

  const fields: [string, string | number | null][] = [
    [dict.companyName, leadRow.company_name],
    [dict.contactName, leadRow.contact_name],
    [common.email, leadRow.email],
    [common.phone, leadRow.phone],
    [common.city, leadRow.city],
    [common.industry, leadRow.industry],
    [common.country, leadRow.country],
    [common.status, dict.stages[leadRow.status]],
    [dict.score, leadRow.score],
  ]

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crm/leads" className="btn-ghost inline-block rounded-xl px-4 py-2 text-sm">
        ← {dict.backToLeads}
      </Link>

      <h1 className="gold-text text-2xl font-bold">{dict.leadDetail}</h1>

      <div className="glass rounded-2xl p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className={label}>{k}</dt>
              <dd className="text-sm text-slate-100" dir={k === common.email || k === common.phone ? 'ltr' : undefined}>
                {v ?? '—'}
              </dd>
            </div>
          ))}
        </dl>

        <form action={async (fd: FormData) => { await updateLead(leadRow.id, fd) }} className="mt-6">
          <label className={label}>{common.notes}</label>
          <textarea
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={leadRow.notes ?? ''}
            placeholder={dict.notesPlaceholder}
            className={input}
          />
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">
              {common.save}
            </button>
          </div>
        </form>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">{dict.followUps}</h2>

        {followUpRows.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">{dictionaries[lang].dashboard.noData}</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {followUpRows.map((fu) => {
              const overdue = !fu.done && new Date(fu.due_at).getTime() < now
              return (
                <li
                  key={fu.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    overdue ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <FollowUpToggle id={fu.id} done={fu.done} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span dir="ltr">
                        {dict.dueOn}: {new Date(fu.due_at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
                      </span>
                      {overdue && (
                        <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-medium text-rose-300">
                          {dict.overdue}
                        </span>
                      )}
                      {fu.done && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                          {dict.done}
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

        <form action={async (fd: FormData) => { await createFollowUp(leadRow.id, fd) }} className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div>
            <label className={label}>{dict.dueDate}</label>
            <input name="due_at" type="datetime-local" required className={input} dir="ltr" />
          </div>
          <div>
            <label className={label}>{dict.note}</label>
            <input name="note" maxLength={2000} placeholder={dict.notesPlaceholder} className={input} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">
              {dict.newFollowUp}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
