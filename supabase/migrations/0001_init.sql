-- GCC Nexus AI — initial schema (0001)
-- Run once in the Supabase SQL editor. Creates all tables, indexes,
-- row-level security, tenant-isolation policies and the signup RPC.

-- ---------------------------------------------------------------- tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null check (country in ('AE','SA')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  city text,
  industry text,
  country text check (country in ('AE','SA')),
  status text not null default 'new' check (status in ('new','contacted','qualified','proposal','won','lost')),
  score int not null default 0 check (score >= 0 and score <= 100),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  customer_id uuid references public.customers(id) on delete set null,
  value numeric not null default 0,
  currency text not null default 'AED' check (currency in ('AED','SAR','USD')),
  stage text not null default 'new' check (stage in ('new','contacted','qualified','proposal','won','lost')),
  probability int not null default 10 check (probability >= 0 and probability <= 100),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('caption','ad_copy','description','email')),
  content_ar text,
  content_en text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- follow_ups
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  due_at timestamptz not null,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes
create index leads_tenant_id_idx on public.leads (tenant_id);
create index customers_tenant_id_idx on public.customers (tenant_id);
create index deals_tenant_id_idx on public.deals (tenant_id);
create index campaigns_tenant_id_idx on public.campaigns (tenant_id);
create index follow_ups_tenant_id_idx on public.follow_ups (tenant_id);
create index leads_status_idx on public.leads (status);
create index follow_ups_due_at_idx on public.follow_ups (due_at);

-- ---------------------------------------------------------------- row level security
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.deals enable row level security;
alter table public.campaigns enable row level security;
alter table public.follow_ups enable row level security;

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so RLS policies can resolve the caller's tenant.
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------- policies
create policy "tenant_isolation" on public.tenants
  for all using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- profiles: read tenant-mates, but only touch your own row
create policy "profiles_select" on public.profiles
  for select using (tenant_id = public.current_tenant_id());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "tenant_isolation" on public.leads
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation" on public.customers
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation" on public.deals
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation" on public.campaigns
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation" on public.follow_ups
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------- signup RPC
-- Creates a tenant + admin profile for the newly signed-up user.
create or replace function public.create_tenant_for_user(p_tenant_name text, p_country text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_country not in ('AE','SA') then raise exception 'invalid country'; end if;
  insert into tenants(name, country) values (nullif(trim(p_tenant_name),''), p_country)
    returning id into v_tenant;
  insert into profiles(id, tenant_id, role, full_name)
    values (auth.uid(), v_tenant, 'admin', nullif(trim(p_full_name),''))
    on conflict (id) do update set tenant_id = excluded.tenant_id, role='admin', full_name = excluded.full_name;
  return v_tenant;
end $$;

grant execute on function public.create_tenant_for_user(text,text,text) to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
