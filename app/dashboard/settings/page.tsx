import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

export default async function SettingsPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')
  const { user, profile } = session

  const cookieStore = await cookies()
  const lang: Lang = cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
  const dict = dictionaries[lang]

  // The dashboard layout guarantees a profile; fall back gracefully anyway.
  const supabase = await createClient()
  const { data: tenantRow } = profile
    ? await supabase
        .from('tenants')
        .select('name, country')
        .eq('id', profile.tenant_id)
        .maybeSingle()
    : { data: null }
  const tenant = tenantRow as { name?: string; country?: string } | null
  const tenantCountry = tenant?.country

  const rows: [string, string][] = [
    [dict.auth.fullName, profile?.full_name || '—'],
    [dict.common.email, user.email ?? '—'],
    [
      dict.common.role,
      profile ? (profile.role === 'admin' ? dict.settings.admin : dict.settings.member) : '—',
    ],
    [dict.common.workspace, tenant?.name ?? '—'],
    [
      dict.common.country,
      tenantCountry === 'SA' ? dict.auth.saudi : tenantCountry === 'AE' ? dict.auth.uae : '—',
    ],
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-up">
        <h2 className="text-lg font-bold gold-text mb-4">{dict.settings.profile}</h2>
        <dl className="divide-y divide-white/10">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-sm text-slate-400">{label}</dt>
              <dd className="text-sm font-semibold text-end" dir="auto">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        className="glass rounded-2xl p-6 sm:p-8 animate-fade-up flex items-center justify-between gap-4"
        style={{ animationDelay: '80ms' }}
      >
        <span className="text-sm font-semibold">{dict.settings.language}</span>
        <LanguageToggle />
      </div>

      <form action={logout} className="animate-fade-up" style={{ animationDelay: '140ms' }}>
        <button type="submit" className="btn-gold w-full rounded-2xl px-5 py-3 text-sm">
          {dict.common.logout}
        </button>
      </form>
    </div>
  )
}
