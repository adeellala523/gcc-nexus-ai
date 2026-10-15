import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { cleanStr, toIntInRange } from '@/lib/validation'
import type { DealCurrency, DealStage } from '@/lib/types'

const STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const CURRENCIES: DealCurrency[] = ['AED', 'SAR', 'USD']

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN
  if (Number.isNaN(n)) return null
  return n
}

export async function GET() {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      'id, tenant_id, title, customer_id, value, currency, stage, probability, created_at, customers(name)'
    )
    .eq('tenant_id', session.profile.tenant_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  return NextResponse.json({ deals: data })
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

  const title = cleanStr(b.title, 160)
  if (!title) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const rawValue = toNumber(b.value) ?? 0
  if (rawValue < 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const rawCurrency = cleanStr(b.currency, 3)
  if (rawCurrency && !CURRENCIES.includes(rawCurrency as DealCurrency)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const currency: DealCurrency = (rawCurrency || 'AED') as DealCurrency

  const rawStage = cleanStr(b.stage, 20)
  if (rawStage && !STAGES.includes(rawStage as DealStage)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const stage: DealStage = (rawStage || 'new') as DealStage

  const rawProbability = toIntInRange(b.probability, 0, 100)
  if (b.probability !== undefined && rawProbability === null) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const probability = rawProbability ?? 50

  const rawCustomerId = cleanStr(b.customer_id, 64) || null

  const supabase = await createClient()

  // Ensure the customer belongs to this tenant when one is supplied.
  if (rawCustomerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', rawCustomerId)
      .eq('tenant_id', session.profile.tenant_id)
      .maybeSingle()
    if (customerError || !customer) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('deals')
    .insert({
      tenant_id: session.profile.tenant_id,
      title,
      customer_id: rawCustomerId,
      value: rawValue,
      currency,
      stage,
      probability,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ deal: data }, { status: 201 })
}
