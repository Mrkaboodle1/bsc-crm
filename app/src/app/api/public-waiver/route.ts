import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public POST — files a signed waiver from any website intake (free trial,
// holiday workshop, Kids Night Out) straight into signed_waivers so it shows
// up under Compliance → Signed Waivers with the drawn signature attached.
// No auth: it only ever INSERTS, and every field is length-capped.
type Body = {
  eventType?: string
  parentName?: string
  email?: string
  phone?: string
  children?: string
  medical?: string
  emergency?: string
  consentPhoto?: string
  termsAgreed?: boolean
  signature?: string
  familyId?: string | null
  answers?: unknown
  tenantSlug?: string
}

const s = (v: unknown, n: number) => (v ?? '').toString().trim().slice(0, n)

export async function POST(req: Request) {
  let b: Body = {}
  try { b = await req.json() } catch { /* ignore */ }

  const parentName = s(b.parentName, 160)
  const signature = s(b.signature, 400_000) // PNG data-URL of the drawn signature
  if (!parentName || !signature || b.termsAgreed !== true) {
    return NextResponse.json({ ok: false, error: 'A signature and the waiver tick are required.' }, { status: 400 })
  }

  try {
    const admin = await createServerSupabaseAdmin()
    const tenantSlug = s(b.tenantSlug, 80) || 'bigstarcircus'
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle()
    if (!tenant) return NextResponse.json({ ok: true, stored: false })

    const { error } = await admin.from('signed_waivers').insert({
      tenant_id: tenant.id,
      family_id: b.familyId || null,
      event_type: s(b.eventType, 60) || 'website',
      parent_name: parentName,
      email: s(b.email, 200) || null,
      phone: s(b.phone, 60) || null,
      children: s(b.children, 500) || null,
      medical: s(b.medical, 2000) || null,
      emergency: s(b.emergency, 300) || null,
      consent_photo: s(b.consentPhoto, 20) || null,
      terms_agreed: true,
      signature,
      signed_at: new Date().toISOString(),
      answers: b.answers ?? null,
    })
    if (error) { console.error('public-waiver insert', error.message); return NextResponse.json({ ok: true, stored: false }) }
    return NextResponse.json({ ok: true, stored: true })
  } catch (err) {
    console.error('public-waiver error', err)
    return NextResponse.json({ ok: true, stored: false })
  }
}
