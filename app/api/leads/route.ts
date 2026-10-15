import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { cleanStr, isEmail, isPhone, toIntInRange } from '@/lib/validation'
import type { LeadStatus, TenantCountry } from '@/lib/types'

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const COUNTRIES: TenantCountry[] = ['AE', 'SA']

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select(
      'id, tenant_id, company_name, contact_name, email, phone, city, industry, country, status, score, notes, created_at'
    )
    .eq('tenant_id', session.profile.tenant_id)
    .order('created_at', { ascending: false })

  if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
    query = query.eq('status', status)
  }
  if (q && q.trim()) {
    const like = `%${q.trim().slice(0, 80)}%`
    query = query.or(
      `company_name.ilike.${like},contact_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`
    )
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  return NextResponse.json({ leads: data })
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const company_name = cleanStr(b.company_name, 120)
  if (!company_name) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const contact_name = cleanStr(b.contact_name, 120) || null
  const rawEmail = cleanStr(b.email, 160)
  const email = rawEmail ? (isEmail(rawEmail) ? rawEmail : null) : null
  if (rawEmail && !email) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const rawPhone = cleanStr(b.phone, 32)
  const phone = rawPhone ? (isPhone(rawPhone) ? rawPhone : null) : null
  if (rawPhone && !phone) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const city = cleanStr(b.city, 80) || null
  const industry = cleanStr(b.industry, 80) || null
  const rawCountry = cleanStr(b.country, 2)
  const country: TenantCountry | null = COUNTRIES.includes(rawCountry as TenantCountry)
    ? (rawCountry as TenantCountry)
    : null

  const rawStatus = cleanStr(b.status, 20)
  const status: LeadStatus = LEAD_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : 'new'

  const score = toIntInRange(b.score, 0, 100) ?? 0
  const notes = cleanStr(b.notes, 1000) || null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: session.profile.tenant_id,
      company_name,
      contact_name,
      email,
      phone,
      city,
      industry,
      country,
      status,
      score,
      notes,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ lead: data }, { status: 201 })
}
