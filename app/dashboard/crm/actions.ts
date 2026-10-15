'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import type { DealCurrency, DealStage, LeadStatus } from '@/lib/types'
import { cleanStr, isEmail, isPhone, toIntInRange } from '@/lib/validation'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ActionResult = { ok: boolean; error?: string }

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const DEAL_STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const CURRENCIES: DealCurrency[] = ['AED', 'SAR', 'USD']
const COUNTRIES = ['AE', 'SA'] as const

// Throws Error("unauthorized") when there is no signed-in user with a profile.
// RLS is tenant-isolated, so callers pass tenant_id explicitly on writes.
async function tenant(): Promise<{ supabase: SupabaseClient; tenantId: string }> {
  const session = await getSessionUser()
  if (!session?.user || !session.profile) throw new Error('unauthorized')
  const supabase = await createClient()
  return { supabase, tenantId: session.profile.tenant_id }
}

function optStr(fd: FormData, key: string, maxLen: number): string | null {
  const v = cleanStr(fd.get(key), maxLen)
  return v === '' ? null : v
}

function validStatus(v: string | null): v is LeadStatus {
  return v !== null && (LEAD_STATUSES as string[]).includes(v)
}

function validStage(v: string | null): v is DealStage {
  return v !== null && (DEAL_STAGES as string[]).includes(v)
}

function checkEmail(v: string | null): string | null {
  if (v !== null && !isEmail(v)) return 'Invalid email address'
  return null
}

function checkPhone(v: string | null): string | null {
  if (v !== null && !isPhone(v)) return 'Invalid phone number'
  return null
}

// ---------------------------------------------------------------- leads

export async function createLead(fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()

  const company_name = cleanStr(fd.get('company_name'), 120)
  if (!company_name) return { ok: false, error: 'Company name is required' }
  const contact_name = optStr(fd, 'contact_name', 120)
  const email = optStr(fd, 'email', 160)
  const phone = optStr(fd, 'phone', 40)
  const city = optStr(fd, 'city', 80)
  const industry = optStr(fd, 'industry', 80)
  const rawCountry = optStr(fd, 'country', 4)
  const rawStatus = optStr(fd, 'status', 20)
  const notes = optStr(fd, 'notes', 2000)

  const emailErr = checkEmail(email)
  if (emailErr) return { ok: false, error: emailErr }
  const phoneErr = checkPhone(phone)
  if (phoneErr) return { ok: false, error: phoneErr }
  if (rawCountry !== null && !(COUNTRIES as readonly string[]).includes(rawCountry))
    return { ok: false, error: 'Invalid country' }
  if (rawStatus !== null && !validStatus(rawStatus)) return { ok: false, error: 'Invalid status' }

  const rawScore = cleanStr(fd.get('score'), 8)
  const score = rawScore === '' ? 0 : toIntInRange(rawScore, 0, 100)
  if (score === null) return { ok: false, error: 'Score must be 0–100' }

  const { error } = await supabase.from('leads').insert({
    tenant_id: tenantId,
    company_name,
    contact_name,
    email,
    phone,
    city,
    industry,
    country: rawCountry,
    status: rawStatus ?? 'new',
    score,
    notes,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/leads')
  return { ok: true }
}

// Only updates whitelisted fields that are present in the FormData, so the
// detail page can submit just the notes textarea safely.
export async function updateLead(id: string, fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing lead id' }

  const patch: Record<string, string | number | null> = {}
  if (fd.has('company_name')) {
    const v = cleanStr(fd.get('company_name'), 120)
    if (!v) return { ok: false, error: 'Company name is required' }
    patch.company_name = v
  }
  if (fd.has('contact_name')) patch.contact_name = optStr(fd, 'contact_name', 120)
  if (fd.has('industry')) patch.industry = optStr(fd, 'industry', 80)
  if (fd.has('city')) patch.city = optStr(fd, 'city', 80)
  if (fd.has('email')) {
    const email = optStr(fd, 'email', 160)
    const err = checkEmail(email)
    if (err) return { ok: false, error: err }
    patch.email = email
  }
  if (fd.has('phone')) {
    const phone = optStr(fd, 'phone', 40)
    const err = checkPhone(phone)
    if (err) return { ok: false, error: err }
    patch.phone = phone
  }
  if (fd.has('country')) {
    const c = optStr(fd, 'country', 4)
    if (c !== null && !(COUNTRIES as readonly string[]).includes(c))
      return { ok: false, error: 'Invalid country' }
    patch.country = c
  }
  if (fd.has('status')) {
    const s = optStr(fd, 'status', 20)
    if (s !== null && !validStatus(s)) return { ok: false, error: 'Invalid status' }
    if (s !== null) patch.status = s
  }
  if (fd.has('score')) {
    const raw = cleanStr(fd.get('score'), 8)
    const score = raw === '' ? 0 : toIntInRange(raw, 0, 100)
    if (score === null) return { ok: false, error: 'Score must be 0–100' }
    patch.score = score
  }
  if (fd.has('notes')) patch.notes = optStr(fd, 'notes', 2000)

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/leads')
  revalidatePath(`/dashboard/crm/leads/${id}`)
  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing lead id' }

  const { error } = await supabase.from('leads').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/leads')
  revalidatePath('/dashboard/crm/pipeline')
  revalidatePath('/dashboard/crm/follow-ups')
  return { ok: true }
}

export async function setLeadStage(id: string, stage: LeadStatus): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing lead id' }
  if (!validStatus(stage)) return { ok: false, error: 'Invalid stage' }

  const { error } = await supabase
    .from('leads')
    .update({ status: stage })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/leads')
  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

// ---------------------------------------------------------------- follow-ups

export async function createFollowUp(leadId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!leadId) return { ok: false, error: 'Missing lead id' }

  const rawDue = cleanStr(fd.get('due_at'), 32)
  const due = rawDue ? new Date(rawDue) : null
  if (!due || Number.isNaN(due.getTime())) return { ok: false, error: 'Invalid due date' }
  const note = optStr(fd, 'note', 2000)

  const { error } = await supabase.from('follow_ups').insert({
    tenant_id: tenantId,
    lead_id: leadId,
    due_at: due.toISOString(),
    note,
    done: false,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/dashboard/crm/leads/${leadId}`)
  revalidatePath('/dashboard/crm/follow-ups')
  return { ok: true }
}

export async function toggleFollowUp(id: string, done: boolean): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing follow-up id' }

  const { error } = await supabase
    .from('follow_ups')
    .update({ done })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/follow-ups')
  return { ok: true }
}

// ---------------------------------------------------------------- customers

export async function createCustomer(fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()

  const name = cleanStr(fd.get('name'), 120)
  if (!name) return { ok: false, error: 'Customer name is required' }
  const email = optStr(fd, 'email', 160)
  const phone = optStr(fd, 'phone', 40)
  const company = optStr(fd, 'company', 120)
  const notes = optStr(fd, 'notes', 2000)

  const emailErr = checkEmail(email)
  if (emailErr) return { ok: false, error: emailErr }
  const phoneErr = checkPhone(phone)
  if (phoneErr) return { ok: false, error: phoneErr }

  const { error } = await supabase.from('customers').insert({
    tenant_id: tenantId,
    name,
    email,
    phone,
    company,
    notes,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/customers')
  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

export async function updateCustomer(id: string, fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing customer id' }

  const name = cleanStr(fd.get('name'), 120)
  if (!name) return { ok: false, error: 'Customer name is required' }
  const email = optStr(fd, 'email', 160)
  const phone = optStr(fd, 'phone', 40)
  const company = optStr(fd, 'company', 120)
  const notes = optStr(fd, 'notes', 2000)

  const emailErr = checkEmail(email)
  if (emailErr) return { ok: false, error: emailErr }
  const phoneErr = checkPhone(phone)
  if (phoneErr) return { ok: false, error: phoneErr }

  const { error } = await supabase
    .from('customers')
    .update({ name, email, phone, company, notes })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/customers')
  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing customer id' }

  const { error } = await supabase.from('customers').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/customers')
  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

// ---------------------------------------------------------------- deals

export async function createDeal(fd: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()

  const title = cleanStr(fd.get('title'), 160)
  if (!title) return { ok: false, error: 'Deal title is required' }
  const customer_id = optStr(fd, 'customer_id', 64)
  const rawValue = cleanStr(fd.get('value'), 24)
  const value = rawValue === '' ? 0 : Number(rawValue)
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'Invalid deal value' }
  const currency = optStr(fd, 'currency', 4) ?? 'AED'
  if (!(CURRENCIES as string[]).includes(currency))
    return { ok: false, error: 'Invalid currency' }
  const rawStage = optStr(fd, 'stage', 20) ?? 'new'
  if (!validStage(rawStage)) return { ok: false, error: 'Invalid stage' }
  const rawProb = cleanStr(fd.get('probability'), 8)
  const probability = rawProb === '' ? 10 : toIntInRange(rawProb, 0, 100)
  if (probability === null) return { ok: false, error: 'Probability must be 0–100' }

  const { error } = await supabase.from('deals').insert({
    tenant_id: tenantId,
    title,
    customer_id: customer_id === '' ? null : customer_id,
    value,
    currency: currency as DealCurrency,
    stage: rawStage,
    probability,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/pipeline')
  revalidatePath('/dashboard/crm/customers')
  return { ok: true }
}

export async function updateDealStage(id: string, stage: DealStage): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing deal id' }
  if (!validStage(stage)) return { ok: false, error: 'Invalid stage' }

  const { error } = await supabase
    .from('deals')
    .update({ stage })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  const { supabase, tenantId } = await tenant()
  if (!id) return { ok: false, error: 'Missing deal id' }

  const { error } = await supabase.from('deals').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/crm/pipeline')
  return { ok: true }
}
