// Shared TypeScript models mirroring the Supabase schema (0001_init).

export type TenantCountry = 'AE' | 'SA'
export type UserRole = 'admin' | 'member'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type DealStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type DealCurrency = 'AED' | 'SAR' | 'USD'
export type CampaignType = 'caption' | 'ad_copy' | 'description' | 'email'
export type CampaignStatus = 'draft' | 'active' | 'archived'

export interface Tenant {
  id: string
  name: string
  country: TenantCountry
  created_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface Lead {
  id: string
  tenant_id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  industry: string | null
  country: TenantCountry | null
  status: LeadStatus
  score: number
  notes: string | null
  created_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  created_at: string
}

export interface Deal {
  id: string
  tenant_id: string
  title: string
  customer_id: string | null
  value: number
  currency: DealCurrency
  stage: DealStage
  probability: number
  created_at: string
}

export interface Campaign {
  id: string
  tenant_id: string
  name: string
  type: CampaignType
  content_ar: string | null
  content_en: string | null
  status: CampaignStatus
  created_at: string
}

export interface FollowUp {
  id: string
  tenant_id: string
  lead_id: string | null
  due_at: string
  note: string | null
  done: boolean
  created_at: string
}

// Flattened session context used across pages/actions.
export interface SessionProfile {
  userId: string
  email: string
  tenantId: string
  role: UserRole
  fullName: string | null
  tenantName: string
  tenantCountry: TenantCountry
}
