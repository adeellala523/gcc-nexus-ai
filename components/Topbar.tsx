'use client'

import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import type { Dict } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

function titleForPath(pathname: string, dict: Dict): string {
  if (pathname.startsWith('/dashboard/crm/leads')) return dict.crm.leads
  if (pathname.startsWith('/dashboard/crm/pipeline')) return dict.crm.pipeline
  if (pathname.startsWith('/dashboard/crm/customers')) return dict.crm.customers
  if (pathname.startsWith('/dashboard/crm/follow-ups')) return dict.crm.followUps
  if (pathname.startsWith('/dashboard/crm')) return dict.nav.crm
  if (pathname.startsWith('/dashboard/marketing')) return dict.marketing.title
  if (pathname.startsWith('/dashboard/settings')) return dict.settings.title
  return dict.dashboard.title
}

// Client topbar: title follows the current route; language toggle,
// user avatar and logout on the end side.
export default function Topbar({
  dict,
  userEmail,
}: {
  dict: Dict
  userEmail: string
}) {
  const pathname = usePathname()
  const title = titleForPath(pathname ?? '/dashboard', dict)
  const initial = (userEmail.trim()[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-30 bg-[#0b1426]/85 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        {/* ps-12 leaves room for the mobile hamburger rendered by the Sidebar */}
        <h1 className="text-lg sm:text-xl font-bold truncate ps-12 lg:ps-0 animate-fade-in" key={title}>
          {title}
        </h1>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <LanguageToggle />
          <div
            className="w-9 h-9 rounded-full btn-gold flex items-center justify-center text-sm font-extrabold shrink-0"
            title={userEmail}
            aria-label={userEmail}
          >
            {initial}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="btn-ghost rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap"
            >
              {dict.common.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
