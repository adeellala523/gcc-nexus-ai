import { cookies } from 'next/headers'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import MarketingStudio from '@/components/marketing/MarketingStudio'
import type { Campaign } from '@/lib/types'

export default async function MarketingPage() {
  const cookieStore = await cookies()
  const lang: Lang = cookieStore.get('nexus-lang')?.value === 'en' ? 'en' : 'ar'
  const t = dictionaries[lang].marketing

  const session = await getSessionUser()
  if (!session || !session.profile) {
    // Proxy guards /dashboard/* for login; render nothing if somehow unauthenticated.
    return null
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('campaigns')
    .select('id, tenant_id, name, type, content_ar, content_en, status, created_at')
    .eq('tenant_id', session.profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(20)

  const campaigns = (data ?? []) as Campaign[]

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="gold-text text-3xl font-extrabold">{t.title}</h1>
        <p className="mt-1 text-sm text-mist">{t.subtitle}</p>
      </header>
      <MarketingStudio lang={lang} initialHistory={campaigns} />
    </div>
  )
}
