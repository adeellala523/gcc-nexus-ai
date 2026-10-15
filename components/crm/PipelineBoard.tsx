'use client'

import { useState } from 'react'
import { setLeadStage } from '@/app/dashboard/crm/actions'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Lead, LeadStatus } from '@/lib/types'

export type BoardLead = Pick<Lead, 'id' | 'company_name' | 'contact_name' | 'score' | 'status'>

const STAGES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

// Kanban board with HTML5 drag-and-drop. Drop a card into a column to move the
// lead; the stage updates optimistically and setLeadStage persists it.
export function PipelineBoard({ initialLeads, lang }: { initialLeads: BoardLead[]; lang: Lang }) {
  const dict = dictionaries[lang].crm
  const [leads, setLeads] = useState<BoardLead[]>(initialLeads)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropStage, setDropStage] = useState<LeadStatus | null>(null)

  const move = async (id: string, stage: LeadStatus) => {
    const prev = leads
    const target = prev.find((l) => l.id === id)
    if (!target || target.status === stage) return
    setLeads(prev.map((l) => (l.id === id ? { ...l, status: stage } : l)))
    const res = await setLeadStage(id, stage)
    if (!res.ok) setLeads(prev) // revert on failure
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const cards = leads.filter((l) => l.status === stage)
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault()
              setDropStage(stage)
            }}
            onDragLeave={() => setDropStage(null)}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || dragId
              setDropStage(null)
              setDragId(null)
              if (id) void move(id, stage)
            }}
            className={`glass min-h-[220px] rounded-2xl p-3 transition ${
              dropStage === stage ? 'ring-2 ring-[rgba(212,175,55,0.6)]' : ''
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">{dict.stages[stage]}</h3>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400" dir="ltr">
                {cards.length}
              </span>
            </div>
            <div className="space-y-2">
              {cards.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', lead.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDragId(lead.id)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setDropStage(null)
                  }}
                  className={`cursor-grab rounded-xl border border-white/10 bg-white/[0.04] p-3 transition active:cursor-grabbing hover:border-[rgba(212,175,55,0.35)] ${
                    dragId === lead.id ? 'opacity-40' : ''
                  }`}
                >
                  <div className="truncate text-sm font-semibold text-slate-100">{lead.company_name}</div>
                  {lead.contact_name && (
                    <div className="truncate text-xs text-slate-400">{lead.contact_name}</div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{dict.score}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        lead.score >= 70 ? 'gold-text border border-[rgba(212,175,55,0.4)]' : 'text-slate-300'
                      }`}
                      dir="ltr"
                    >
                      {lead.score}
                    </span>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">—</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
