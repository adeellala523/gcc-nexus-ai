import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { logout } from '@/app/(auth)/actions'
import { getSessionUser } from '@/lib/supabase/server'
import { dictionaries, type Lang } from '@/lib/i18n'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUser()
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const lang: Lang = cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
  const dict = dictionaries[lang]

  // Signed in but the profile row was never created (e.g. signup interrupted):
  // show a dead-end card instead of a broken dashboard.
  if (!session.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-sm w-full text-center animate-fade-up">
          <p className="gold-text text-2xl font-extrabold tracking-tight">GCC NEXUS AI</p>
          <h1 className="text-lg font-bold mt-4">{dict.common.setupIncomplete}</h1>
          <p className="text-sm text-slate-400 mt-2">{dict.common.setupIncompleteHint}</p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm font-semibold w-full"
            >
              {dict.common.logout}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar lang={lang} dict={dict} userEmail={session.user.email ?? ''} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar dict={dict} userEmail={session.user.email ?? ''} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
