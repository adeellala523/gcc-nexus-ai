'use client'

import Link from 'next/link'
import { deleteLead } from '@/app/dashboard/crm/actions'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Lead, LeadStatus } from '@/lib/types'
import { DeleteButton } from './DeleteButton'

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  contacted: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  qualified: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  proposal: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  won: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  lost: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export function LeadsTable({ leads, lang }: { leads: Lead[]; lang: Lang }) {
  const dict = dictionaries[lang].crm
  const common = dictionaries[lang].common

  if (leads.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-slate-400">
        {dictionaries[lang].dashboard.noData}
      </div>
    )
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-start text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 text-start font-medium">{dict.companyName}</th>
            <th className="px-4 py-3 text-start font-medium">
              {common.city} / {common.industry}
            </th>
            <th className="px-4 py-3 text-start font-medium">{common.status}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.score}</th>
            <th className="px-4 py-3 text-start font-medium">{common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-100">{lead.company_name}</div>
                {lead.contact_name && (
                  <div className="text-xs text-slate-400">{lead.contact_name}</div>
                )}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {[lead.city, lead.industry].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lead.status]}`}
                >
                  {dict.stages[lead.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                    lead.score >= 70 ? 'gold-text border border-[rgba(212,175,55,0.4)]' : 'text-slate-300'
                  }`}
                  dir="ltr"
                >
                  {lead.score}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/crm/leads/${lead.id}`}
                    className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                  >
                    {dict.view}
                  </Link>
                  <DeleteButton
                    onDelete={() => deleteLead(lead.id)}
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
  )
}
