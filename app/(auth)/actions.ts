'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { cleanStr, isEmail } from '../../lib/validation'
import type { Lang } from '../../lib/i18n'
import type { TenantCountry as TenantCountryType } from '../../lib/types'

// Shape returned to useActionState; a successful login/signup always redirects
// (redirect() throws), so the action only ever returns on failure.
export type AuthState = { error: string } | null

const MESSAGES: Record<Lang, Record<string, string>> = {
  en: {
    invalidFields: 'Please enter a valid email and password.',
    invalidLogin: 'Incorrect email or password. Please try again.',
    passwordWeak: 'Password must be at least 8 characters long.',
    missingFields: 'Please fill in every field.',
    invalidCountry: 'Please choose a valid country.',
    emailTaken:
      'An account with this email already exists. Please sign in instead.',
    signupFailed: 'Could not create your account. Please try again.',
    tenantFailed:
      'Your account was created but workspace setup failed. Please contact support.',
  },
  ar: {
    invalidFields: 'يرجى إدخال بريد إلكتروني وكلمة مرور صالحين.',
    invalidLogin: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.',
    passwordWeak: 'يجب أن تتكون كلمة المرور من ٨ أحرف على الأقل.',
    missingFields: 'يرجى ملء جميع الحقول.',
    invalidCountry: 'يرجى اختيار دولة صالحة.',
    emailTaken: 'يوجد حساب بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول.',
    signupFailed: 'تعذر إنشاء حسابك. حاول مرة أخرى.',
    tenantFailed:
      'تم إنشاء حسابك لكن إعداد مساحة العمل فشل. يرجى التواصل مع الدعم.',
  },
}

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return cookieStore.get('nexus-lang')?.value === 'ar' ? 'ar' : 'en'
}

function err(lang: Lang, key: string): AuthState {
  return { error: MESSAGES[lang][key] }
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const lang = await getLang()
  const email = cleanStr(formData.get('email'), 254)
  const password = cleanStr(formData.get('password'), 128)

  if (!isEmail(email) || password.length === 0) {
    return err(lang, 'invalidFields')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Never leak internals (e.g. "Email not confirmed", provider details).
    return err(lang, 'invalidLogin')
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const lang = await getLang()

  const fullName = cleanStr(formData.get('fullName'), 120)
  const companyName = cleanStr(formData.get('companyName'), 160)
  const countryRaw = cleanStr(formData.get('country'), 8)
  const email = cleanStr(formData.get('email'), 254)
  const password = cleanStr(formData.get('password'), 128)

  const country: TenantCountryType | null =
    countryRaw === 'AE' || countryRaw === 'SA' ? countryRaw : null

  if (!fullName || !companyName || !isEmail(email) || password.length === 0) {
    return err(lang, 'missingFields')
  }
  if (password.length < 8) {
    return err(lang, 'passwordWeak')
  }
  if (!country) {
    return err(lang, 'invalidCountry')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return err(lang, 'emailTaken')
    }
    return err(lang, 'signupFailed')
  }

  // Email confirmation enabled and no session issued yet: verify the account,
  // then ask the user to confirm via email before signing in.
  if (!data.session) {
    redirect('/login?check=email')
  }

  // SECURITY DEFINER RPC creates the tenant + profile for the signed-in user.
  const { error: rpcError } = await supabase.rpc('create_tenant_for_user', {
    p_tenant_name: companyName,
    p_country: country,
    p_full_name: fullName,
  })

  if (rpcError) {
    return err(lang, 'tenantFailed')
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
