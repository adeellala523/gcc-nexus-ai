'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import type { Dict } from '../lib/i18n'
import type { AuthState } from '../app/(auth)/actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-gold w-full rounded-xl px-4 py-3 text-base"
    >
      {pending ? '…' : label}
    </button>
  )
}

const inputClass = 'input-dark mt-1.5'

export default function AuthForm({
  mode,
  dict,
  notice,
  action,
}: {
  mode: 'login' | 'signup'
  dict: Dict['auth']
  notice?: string
  action: (_prev: AuthState, formData: FormData) => Promise<AuthState>
}) {
  const [state, formAction] = useActionState(action, null as AuthState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {notice && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-light">
          {notice}
        </div>
      )}

      {mode === 'signup' && (
        <>
          <label className="block text-sm font-medium text-slate-200">
            {dict.fullName}
            <input
              name="fullName"
              type="text"
              required
              autoComplete="name"
              maxLength={120}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            {dict.companyName}
            <input
              name="companyName"
              type="text"
              required
              autoComplete="organization"
              maxLength={160}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            {dict.country}
            <select name="country" required defaultValue="AE" className={inputClass}>
              <option value="AE">{dict.uae}</option>
              <option value="SA">{dict.saudi}</option>
            </select>
          </label>
        </>
      )}

      <label className="block text-sm font-medium text-slate-200">
        {dict.email}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        {dict.password}
        <input
          name="password"
          type="password"
          required
          minLength={mode === 'signup' ? 8 : undefined}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          maxLength={128}
          className={inputClass}
        />
      </label>

      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      <SubmitButton label={mode === 'signup' ? dict.createAccount : dict.signIn} />

      <p className="pt-2 text-center text-sm text-slate-400">
        {mode === 'signup' ? dict.haveAccount : dict.noAccount}{' '}
        <Link
          href={mode === 'signup' ? '/login' : '/signup'}
          className="font-semibold text-gold hover:text-gold-light"
        >
          {mode === 'signup' ? dict.signIn : dict.signUp}
        </Link>
      </p>
    </form>
  )
}
