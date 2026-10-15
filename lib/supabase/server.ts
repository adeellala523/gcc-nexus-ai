import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Profile } from '../types'

// Server-side Supabase client (Server Components, Route Handlers, Actions).
// Async because next/headers cookies() must be awaited in Next 16.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — session refresh is handled by proxy.ts
          }
        },
      },
    }
  )
}

// Returns the signed-in user plus their profile (tenant_id, role, full_name)
// in a single profiles query. Null when signed out; profile is null when the
// row doesn't exist yet (e.g. signup not finished).
export async function getSessionUser(): Promise<{
  user: User
  profile: Profile | null
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name, created_at')
    .eq('id', user.id)
    .maybeSingle()

  return { user, profile: (data ?? null) as Profile | null }
}
