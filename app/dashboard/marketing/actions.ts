'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { cleanStr } from '@/lib/validation'
import type { CampaignType } from '@/lib/types'

const CAMPAIGN_TYPES: CampaignType[] = ['caption', 'ad_copy', 'description', 'email']

export interface SaveCampaignInput {
  name: string
  type: CampaignType
  content_ar?: string
  content_en?: string
}

export async function saveCampaign(input: SaveCampaignInput): Promise<{ ok: true }> {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    throw new Error('unauthenticated')
  }
  const tenantId = session.profile.tenant_id

  const name = cleanStr(input.name, 120)
  const content_ar = input.content_ar ? cleanStr(input.content_ar, 10000) : null
  const content_en = input.content_en ? cleanStr(input.content_en, 10000) : null

  if (!name || !CAMPAIGN_TYPES.includes(input.type) || (!content_ar && !content_en)) {
    throw new Error('invalid_input')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('campaigns').insert({
    tenant_id: tenantId,
    name,
    type: input.type,
    content_ar,
    content_en,
    status: 'draft',
  })
  if (error) {
    throw new Error('save_failed')
  }

  revalidatePath('/dashboard/marketing')
  return { ok: true }
}

export async function deleteCampaign(id: string): Promise<{ ok: true }> {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    throw new Error('unauthenticated')
  }
  const tenantId = session.profile.tenant_id

  if (!id || typeof id !== 'string') {
    throw new Error('invalid_input')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('campaigns').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) {
    throw new Error('delete_failed')
  }

  revalidatePath('/dashboard/marketing')
  return { ok: true }
}
