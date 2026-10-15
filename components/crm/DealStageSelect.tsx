'use client'

import { useState } from 'react'
import { updateDealStage } from '@/app/dashboard/crm/actions'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { DealStage } from '@/lib/types'

const STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

// Stage dropdown inside the deals table. Persists via updateDealStage.
export function DealStageSelect({
  id,
  stage,
  lang,
}: {
  id: string
  stage: DealStage
  lang: Lang
}) {
  const dict = dictionaries[lang].crm
  const [value, setValue] = useState<DealStage>(stage)
  const [busy, setBusy] = useState(false)

  return (
    <select
      value={value}
      disabled={busy}
      onChange={async (e) => {
        const next = e.target.value as DealStage
        const prev = value
        setValue(next)
        setBusy(true)
        try {
          const res = await updateDealStage(id, next)
          if (!res.ok) setValue(prev)
        } catch {
          setValue(prev)
        } finally {
          setBusy(false)
        }
      }}
      className="input-dark rounded-lg px-2 py-1 text-xs outline-none disabled:opacity-60"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {dict.stages[s]}
        </option>
      ))}
    </select>
  )
}
