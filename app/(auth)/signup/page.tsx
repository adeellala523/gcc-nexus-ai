import { cookies } from 'next/headers'
import { dictionaries, type Lang } from '../../../lib/i18n'
import LanguageToggle from '../../../components/LanguageToggle'
import AuthForm from '../../../components/AuthForm'
import { signup } from '../actions'

export default async function SignupPage() {
  const cookieStore = await cookies()
  const lang: Lang = cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
  const dict = dictionaries[lang].auth

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-abyss px-4 py-12">
      <div className="absolute end-6 top-6">
        <LanguageToggle />
      </div>

      <div className="glass-strong w-full max-w-md animate-fade-up rounded-3xl p-8 sm:p-10">
        <div className="text-center">
          <h1 className="gold-text text-3xl font-black tracking-tight">
            GCC NEXUS AI
          </h1>
          <p className="mt-2 text-sm text-slate-400">{dict.tagline}</p>
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-100">
          {dict.createAccount}
        </h2>

        <AuthForm mode="signup" dict={dict} action={signup} />
      </div>
    </div>
  )
}
