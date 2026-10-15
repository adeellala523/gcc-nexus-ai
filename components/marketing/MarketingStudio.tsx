'use client'

import { useState } from 'react'
import { dictionaries, type Lang } from '@/lib/i18n'
import type { Campaign } from '@/lib/types'
import { saveCampaign, deleteCampaign } from '@/app/dashboard/marketing/actions'

type Tab = 'captions' | 'adCopy' | 'description'

const TAB_TO_TYPE: Record<Tab, 'caption' | 'ad_copy' | 'description'> = {
  captions: 'caption',
  adCopy: 'ad_copy',
  description: 'description',
}

const INDUSTRIES: Record<Lang, string[]> = {
  ar: [
    'مطاعم ومقاهي',
    'تجزئة',
    'عقارات',
    'سيارات',
    'أزياء',
    'صالونات تجميل',
    'لياقة بدنية',
    'رعاية صحية',
    'لوجستيات وشحن',
    'إلكترونيات',
    'مجوهرات',
    'أثاث',
    'فنادق وضيافة',
    'تعليم',
    'مقاولات',
  ],
  en: [
    'Restaurants & Cafes',
    'Retail',
    'Real Estate',
    'Automotive',
    'Fashion',
    'Beauty Salons',
    'Fitness',
    'Healthcare',
    'Logistics & Shipping',
    'Electronics',
    'Jewelry',
    'Furniture',
    'Hotels & Hospitality',
    'Education',
    'Construction',
  ],
}

interface GenResult {
  demo: boolean
  content_ar: string | null
  content_en: string | null
}

export default function MarketingStudio({
  lang,
  initialHistory,
}: {
  lang: Lang
  initialHistory: Campaign[]
}) {
  const t = dictionaries[lang].marketing
  const common = dictionaries[lang].common

  const [tab, setTab] = useState<Tab>('captions')
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [tone, setTone] = useState<'professional' | 'friendly' | 'luxury' | 'urgent'>('professional')
  const [language, setLanguage] = useState<'ar' | 'en' | 'both'>('both')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [result, setResult] = useState<GenResult | null>(null)
  const [copied, setCopied] = useState<'ar' | 'en' | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<Campaign[]>(initialHistory)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const canGenerate =
    businessName.trim().length > 0 && industry.trim().length > 0 && extra.trim().length > 0

  async function handleGenerate() {
    if (!canGenerate || loading) return
    setLoading(true)
    setGenError(null)
    setResult(null)
    setSaved(false)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: TAB_TO_TYPE[tab],
          businessName: businessName.trim(),
          industry: industry.trim(),
          tone,
          language,
          extra: extra.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? 'failed')
      }
      setResult({
        demo: data.demo === true,
        content_ar: typeof data.content_ar === 'string' ? data.content_ar : null,
        content_en: typeof data.content_en === 'string' ? data.content_en : null,
      })
    } catch {
      setGenError(lang === 'ar' ? 'حدث خطأ أثناء التوليد. حاول مرة أخرى.' : 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(which: 'ar' | 'en') {
    const text = which === 'ar' ? result?.content_ar : result?.content_en
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  async function handleSave() {
    if (!result || saving) return
    setSaving(true)
    try {
      const date = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')
      const name = `${businessName.trim()} — ${t.tabs[tab]} — ${date}`
      await saveCampaign({
        name,
        type: TAB_TO_TYPE[tab],
        content_ar: result.content_ar ?? undefined,
        content_en: result.content_en ?? undefined,
      })
      setSaved(true)
      setHistory((prev) => [
        {
          id: `temp-${Date.now()}`,
          tenant_id: '',
          name,
          type: TAB_TO_TYPE[tab],
          content_ar: result.content_ar,
          content_en: result.content_en,
          status: 'draft',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch {
      setGenError(lang === 'ar' ? 'تعذر الحفظ. حاول مرة أخرى.' : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (id.startsWith('temp-')) {
      setHistory((prev) => prev.filter((c) => c.id !== id))
      return
    }
    try {
      await deleteCampaign(id)
      setHistory((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // ignore — item stays in the list
    }
  }

  const tabs: Tab[] = ['captions', 'adCopy', 'description']

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="glass flex w-fit gap-1 rounded-xl p-1">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === key ? 'btn-gold' : 'text-mist hover:text-white'
            }`}
          >
            {t.tabs[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <section className="glass animate-fade-up rounded-2xl p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-mist">{t.businessName}</label>
              <input
                className="input-dark"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={80}
                dir="auto"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-mist">{t.industry}</label>
              <input
                className="input-dark"
                list="industry-options"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                maxLength={60}
                dir="auto"
              />
              <datalist id="industry-options">
                {INDUSTRIES[lang].map((ind) => (
                  <option key={ind} value={ind} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-mist">{t.tone}</label>
                <select
                  className="input-dark"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                >
                  {(Object.keys(t.tones) as (keyof typeof t.tones)[]).map((key) => (
                    <option key={key} value={key}>
                      {t.tones[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mist">{t.language}</label>
                <select
                  className="input-dark"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as typeof language)}
                >
                  {(Object.keys(t.langs) as (keyof typeof t.langs)[]).map((key) => (
                    <option key={key} value={key}>
                      {t.langs[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-mist">{common.notes}</label>
              <textarea
                className="input-dark min-h-28"
                placeholder={t.promptHint}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                maxLength={300}
                dir="auto"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-gold w-full rounded-xl px-6 py-3"
            >
              {loading ? t.generating : t.generate}
            </button>
            {genError && <p className="text-sm text-red-400">{genError}</p>}
          </div>
        </section>

        {/* Result */}
        <section className="glass animate-fade-up rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.result}</h2>
            {result?.demo && (
              <span className="btn-gold rounded-full px-3 py-1 text-xs">DEMO</span>
            )}
          </div>
          {result?.demo && <p className="mb-3 text-xs text-gold">{t.demoNotice}</p>}
          {!result && !loading && (
            <p className="text-sm text-mist">{t.emptyHistory}</p>
          )}
          {loading && <p className="text-sm text-mist">{t.generating}</p>}
          {result && (
            <div className="space-y-4">
              {result.content_ar && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-gold">{t.langs.ar}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('ar')}
                      className="btn-ghost rounded-lg px-3 py-1 text-xs"
                    >
                      {copied === 'ar' ? '✓' : t.copy}
                    </button>
                  </div>
                  <p dir="rtl" className="whitespace-pre-wrap text-sm leading-relaxed">
                    {result.content_ar}
                  </p>
                </div>
              )}
              {result.content_en && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-gold">{t.langs.en}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('en')}
                      className="btn-ghost rounded-lg px-3 py-1 text-xs"
                    >
                      {copied === 'en' ? '✓' : t.copy}
                    </button>
                  </div>
                  <p dir="ltr" className="whitespace-pre-wrap text-sm leading-relaxed">
                    {result.content_en}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className="btn-gold w-full rounded-xl px-6 py-2.5"
              >
                {saved ? t.saved : saving ? common.loading : t.save}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* History */}
      <section className="glass animate-fade-up rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-bold">{t.history}</h2>
        {history.length === 0 && <p className="text-sm text-mist">{t.emptyHistory}</p>}
        <ul className="space-y-3">
          {history.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[11px] text-gold">
                      {c.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    {new Date(c.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-GB')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="btn-ghost shrink-0 rounded-lg px-3 py-1 text-xs text-red-300"
                >
                  {common.delete}
                </button>
              </div>
              {expandedId === c.id && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {c.content_ar && (
                    <p dir="rtl" className="whitespace-pre-wrap text-sm leading-relaxed">
                      {c.content_ar}
                    </p>
                  )}
                  {c.content_en && (
                    <p dir="ltr" className="whitespace-pre-wrap text-sm leading-relaxed">
                      {c.content_en}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
