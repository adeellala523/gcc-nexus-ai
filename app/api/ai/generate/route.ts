import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSessionUser } from '@/lib/supabase/server'
import { cleanStr } from '@/lib/validation'

const TYPES = ['caption', 'ad_copy', 'description', 'email'] as const
const TONES = ['professional', 'friendly', 'luxury', 'urgent'] as const
const LANGS = ['ar', 'en', 'both'] as const

type GenType = (typeof TYPES)[number]
type GenTone = (typeof TONES)[number]
type GenLanguage = (typeof LANGS)[number]

// Per-instance in-memory rate limit: 10 requests per rolling 60s per tenant.
// This only works for a single server instance; use Redis/Upstash in production.
const rateBuckets = new Map<string, number[]>()

function isRateLimited(tenantId: string): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const hits = (rateBuckets.get(tenantId) ?? []).filter((t) => t > windowStart)
  if (hits.length >= 10) {
    rateBuckets.set(tenantId, hits)
    return true
  }
  hits.push(now)
  rateBuckets.set(tenantId, hits)
  return false
}

interface ValidatedInput {
  type: GenType
  businessName: string
  industry: string
  tone: GenTone
  language: GenLanguage
  extra: string
}

function validateInput(body: unknown): ValidatedInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  const type = b.type
  const tone = b.tone
  const language = b.language
  if (
    !TYPES.includes(type as GenType) ||
    !TONES.includes(tone as GenTone) ||
    !LANGS.includes(language as GenLanguage)
  ) {
    return null
  }

  const businessName = cleanStr(b.businessName, 80)
  const industry = cleanStr(b.industry, 60)
  const extra = cleanStr(b.extra, 300)
  if (!businessName || !industry || !extra) return null

  return {
    type: type as GenType,
    businessName,
    industry,
    tone: tone as GenTone,
    language: language as GenLanguage,
    extra,
  }
}

const TYPE_LABELS_EN: Record<GenType, string> = {
  caption: 'social media caption',
  ad_copy: 'ad copy',
  description: 'business description',
  email: 'promotional email',
}

const TYPE_LABELS_AR: Record<GenType, string> = {
  caption: 'تعليق لمنشور على وسائل التواصل',
  ad_copy: 'نص إعلاني',
  description: 'وصف للنشاط التجاري',
  email: 'بريد إلكتروني ترويجي',
}

function demoContent(input: ValidatedInput): { content_ar: string | null; content_en: string | null } {
  const { type, businessName, industry, tone, language, extra } = input

  let content_en: string | null =
    `[DEMO OUTPUT — connect OPENAI_API_KEY for real AI generation]\n\n` +
    `✨ ${businessName} — ${industry} (tone: ${tone})\n\n` +
    `Template ${TYPE_LABELS_EN[type]}:\n` +
    `Looking for the best ${industry} in the Gulf? ${businessName} has you covered — ${extra}\n` +
    `📩 DM us or WhatsApp today to order. Limited-time offer!\n\n` +
    `#${industry.replace(/\s+/g, '')} #GCC #UAE #Saudi`

  let content_ar: string | null =
    `[مخرجات تجريبية — اربط OPENAI_API_KEY لتوليد حقيقي بالذكاء الاصطناعي]\n\n` +
    `✨ ${businessName} — ${industry} (الأسلوب: ${tone})\n\n` +
    `${TYPE_LABELS_AR[type]} (قالب):\n` +
    `تبحث عن الأفضل في مجال ${industry} في الخليج؟ ${businessName} خيارك الأمثل — ${extra}\n` +
    `📩 راسلنا أو عبر واتساب اليوم للطلب. عرض لفترة محدودة!\n\n` +
    `#${industry.replace(/\s+/g, '')} #الخليج #الإمارات #السعودية`

  if (language === 'ar') content_en = null
  if (language === 'en') content_ar = null

  return { content_ar, content_en }
}

function pickJson(raw: string | null | undefined): { ar: string | null; en: string | null } {
  try {
    const parsed: unknown = JSON.parse(raw ?? '')
    if (typeof parsed !== 'object' || parsed === null) return { ar: null, en: null }
    const o = parsed as Record<string, unknown>
    return {
      ar: typeof o.ar === 'string' && o.ar.trim() ? o.ar : null,
      en: typeof o.en === 'string' && o.en.trim() ? o.en : null,
    }
  } catch {
    return { ar: null, en: null }
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || !session.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const tenantId = session.profile.tenant_id

  if (isRateLimited(tenantId)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const input = validateInput(body)
  if (!input) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Demo mode: no OpenAI key configured — return clearly labeled template copy.
  if (!process.env.OPENAI_API_KEY) {
    const { content_ar, content_en } = demoContent(input)
    return NextResponse.json({ demo: true, content_ar, content_en, notice: 'demo' })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a bilingual (Arabic/English) GCC marketing copywriter. Write persuasive, ' +
            'culturally aware marketing copy for businesses in the UAE and Saudi Arabia. ' +
            'Always respond with a JSON object shaped exactly like {"ar": string|null, "en": string|null} ' +
            'containing the requested content in Arabic and English. Use Gulf-dialect-friendly Modern Standard ' +
            'Arabic with tasteful emojis and relevant hashtags where appropriate.',
        },
        {
          role: 'user',
          content:
            `Write a ${input.type} for the following business.\n` +
            `Business name: ${input.businessName}\n` +
            `Industry: ${input.industry}\n` +
            `Tone: ${input.tone}\n` +
            `Target audience: customers in the UAE and Saudi Arabia.\n` +
            `Extra context: ${input.extra}\n` +
            (input.language === 'both'
              ? 'Provide both Arabic ("ar") and English ("en") versions.'
              : input.language === 'ar'
                ? 'Provide only the Arabic version ("ar"); set "en" to null.'
                : 'Provide only the English version ("en"); set "ar" to null.'),
        },
      ],
    })

    const { ar, en } = pickJson(completion.choices[0]?.message?.content)
    return NextResponse.json({
      demo: false,
      content_ar: ar,
      content_en: en,
    })
  } catch {
    // Never log or return the API key.
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
