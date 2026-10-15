# Supabase setup — GCC Nexus AI

## One-time setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/migrations/0001_init.sql` and run it. It creates all 7 tables,
   indexes, row-level security, tenant-isolation policies and the signup RPC.
3. In the Supabase dashboard go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never
     expose to the browser)
4. Create `.env.local` in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```
5. In **Authentication → Providers**, make sure **Email** is enabled
   (email + password sign-up is the default auth flow for this app).

## How tenant isolation works

- Every row in `leads`, `customers`, `deals`, `campaigns` and `follow_ups`
  carries a `tenant_id`.
- Row-level security is enabled on **all** tables. Policies compare the row's
  `tenant_id` against `public.current_tenant_id()`, which resolves the
  caller's tenant from their `profiles` row — so a user can only ever see
  their own company's data.
- New sign-ups call the `create_tenant_for_user` RPC, which creates a tenant
  and links the user as `admin` of it.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — use it only in trusted
  server-side code (never in client components or API responses).
