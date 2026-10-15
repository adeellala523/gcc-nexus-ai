# GCC NEXUS AI — Your Complete AI Business Growth Platform

Premium AI-powered business growth SaaS for **United Arab Emirates** and **Saudi Arabia**:
lead management, marketing content generation, sales assistance, CRM, WhatsApp Business
integration, competitor intelligence and analytics — in one dark/gold futuristic dashboard
with full **Arabic (RTL)** + **English (LTR)** support.

> **Phase 1** (this repo): authentication, dashboard, Smart CRM, AI Marketing Studio,
> API routes, i18n. Lead Hunter, Sales Assistant, WhatsApp, Competitors and full
> Analytics are Phase 2.

## Tech stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** — Auth, Postgres, Row Level Security (tenant isolation)
- **OpenAI API** — server-side only, for AI content generation
- **Recharts** — dashboard analytics
- **Vercel** — recommended hosting

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- (Optional) An [OpenAI API key](https://platform.openai.com/api-keys) — without it,
  the Marketing Studio runs in clearly-labeled **demo mode**

## Setup

```bash
git clone <repo-url> gcc-nexus-ai
cd gcc-nexus-ai
npm install
cp .env.example .env.local
# fill in .env.local (see below)
npm run dev
```

### 1. Database

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
3. Run it. This creates:
   - `tenants`, `profiles`, `leads`, `customers`, `deals`, `campaigns`, `follow_ups`
   - Row Level Security with **tenant isolation** on every table
   - `current_tenant_id()` helper + `create_tenant_for_user()` signup RPC
4. In **Authentication → Providers**, make sure **Email** is enabled.

More detail: [`supabase/README.md`](supabase/README.md).

### 2. Environment variables (`.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Server scripts only — **never expose client-side** |
| `OPENAI_API_KEY` | no | Real AI generation; empty = labeled demo mode |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini` |

### 3. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build check
```

Sign up at `/signup` — this creates your **tenant (workspace)** and makes you its admin.

## Deployment (Vercel)

1. Push to GitHub, import in Vercel.
2. Add the same environment variables in **Project → Settings → Environment Variables**.
3. Deploy. No build configuration needed (`next build`).

## Project structure

```
app/
  (auth)/login, (auth)/signup   # auth pages + server actions
  dashboard/                   # protected area (proxy.ts gates /dashboard/*)
    page.tsx                   # KPI widgets + charts
    crm/leads, pipeline, customers, follow-ups
    marketing/                 # AI Marketing Studio
    settings/
  api/ai/generate              # OpenAI proxy (10 req/min per tenant)
  api/leads, api/deals         # tenant-scoped REST
components/                    # Sidebar, Topbar, LanguageToggle, crm/*, marketing/*, charts/*
lib/
  supabase/                    # browser + server clients
  i18n.ts                      # ar/en dictionaries (RTL/LTR via nexus-lang cookie)
  types.ts · validation.ts
supabase/migrations/           # SQL schema + RLS
proxy.ts                       # auth gating (Next 16 proxy convention)
```

## Security

- **Tenant isolation**: RLS policies on all tables (`tenant_id = current_tenant_id()`),
  plus server-side tenant checks in actions and API routes.
- **Auth**: Supabase email/password; `/dashboard/*` gated by `proxy.ts`.
- **AI endpoint**: authenticated, input-validated, rate-limited (10/min/tenant, in-memory —
  use Redis/Upstash in production).
- **Secrets**: OpenAI key lives server-side only; never shipped to the client.
- **No fake data**: the app shows real Supabase data; AI demo output is explicitly labeled.

## Phase 2 roadmap

AI Lead Hunter (authorized data providers only — never fake contacts), AI Sales Assistant,
WhatsApp Business Platform integration (consent-based, template-approved), Competitor
Intelligence, full Analytics.

## License

Private — all rights reserved.
