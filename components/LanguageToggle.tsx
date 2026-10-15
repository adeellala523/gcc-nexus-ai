'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '../lib/i18n'

// AR | EN pill. Persists the choice in the `nexus-lang` cookie (read by the
// root layout for <html lang dir>) and reloads so the server renders the new
// language immediately.
export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    setLang(document.documentElement.lang === 'ar' ? 'ar' : 'en')
  }, [])

  const switchTo: Lang = lang === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `nexus-lang=${switchTo}; path=/; max-age=31536000`
        window.location.reload()
      }}
      className="btn-ghost rounded-full px-4 py-1.5 text-xs font-bold tracking-widest"
      aria-label="Switch language"
    >
      <span className={lang === 'ar' ? 'text-gold' : 'opacity-50'}>AR</span>
      <span className="mx-1.5 opacity-40">|</span>
      <span className={lang === 'en' ? 'text-gold' : 'opacity-50'}>EN</span>
    </button>
  )
}
