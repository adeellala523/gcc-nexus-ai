import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { cleanStr, toIntInRange } from '@/lib/validation'
import type { DealStage } from '@/lib/types'

const STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN
  if (Number.isNaN(n)) return null
  return n
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
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

  const updates: Record<string, unknown> = {}

  if (b.title !== undefined) {
    const title = cleanStr(b.title, 160)
    if (!title) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    updates.title = title
  }
  if (b.stage !== undefined) {
    const stage = cleanStr(b.stage, 20)
    if (!STAGES.includes(stage as DealStage)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
    updates.stage = stage
  }
  if (b.probability !== undefined) {
    const probability = toIntInRange(b.probability, 0, 100)
    if (probability === null) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    updates.probability = probability
  }
  if (b.value !== undefined) {
    const value = toNumber(b.value)
    if (value === null || value < 0) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
    updates.value = value
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', session.profile.tenant_id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ deal: data })
}
