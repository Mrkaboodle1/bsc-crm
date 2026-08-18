import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public POST — the satellite waitlist form (Facebook ads land here).
// Creates the family as a LEAD tagged waitlist:<suburb>, deduped by email
// and phone exactly like the signup popup, so an existing family who taps
// the ad never becomes a duplicate.

type Body = {
  suburb?: string
  parentName?: string
  phone?: string
  email?: string
  kidsAges?: string
  visitorId?: string
  utmSource?: string
  utmCampaign?: string
}

const s = (v: unknown, n: number) => (v ?? '').toString().trim().slice(0, n)
const digits = (v: string) => v.replace(/\D/g, '')

const SUBURBS = new Set(['ormeau', 'upper-coomera', 'pacific-pines', 'burleigh-waters', 'palm-beach', 'runaway-bay'])

export async function POST(req: Request) {
  let b: Body = {}
  try { b = await req.json() } catch { /* ignore */ }

  const suburb = s(b.suburb, 40).toLowerCase()
  const parentName = s(b.parentName, 160)
  const phone = s(b.phone, 40)
  const email = s(b.email, 200).toLowerCase()
  const kidsAges = s(b.kidsAges, 200)
  if (!SUBURBS.has(suburb)) return NextResponse.json({ ok: false, error: 'Unknown suburb.' }, { status: 400 })
  if (!parentName || !phone) return NextResponse.json({ ok: false, error: 'Name and phone are required.' }, { status: 400 })

  try {
    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'bigstarcircus').maybeSingle()
    if (!tenant) return NextResponse.json({ ok: false, error: 'Setup issue — call 0489 188 179.' }, { status: 500 })
    const T = tenant.id

    // find before create — email first, then phone tail
    let familyId: string | null = null
    if (email) {
      const { data } = await admin.from('families').select('id').eq('tenant_id', T).ilike('email', email).limit(1)
      if (data?.length) familyId = data[0]!.id
    }
    if (!familyId && digits(phone).length >= 8) {
      const { data } = await admin.from('families').select('id').eq('tenant_id', T).ilike('phone', `%${digits(phone).slice(-9)}%`).limit(1)
      if (data?.length) familyId = data[0]!.id
    }

    const tag = `waitlist:${suburb}`
    const note = `Waitlist ${suburb} (${new Date().toISOString().slice(0, 10)})${kidsAges ? ` — kids: ${kidsAges}` : ''}`
    if (familyId) {
      const { data: fam } = await admin.from('families').select('tags, notes, email, phone').eq('id', familyId).maybeSingle()
      const tags: string[] = (fam?.tags ?? []).filter((t: string) => t !== tag)
      tags.push(tag)
      await admin.from('families').update({
        tags,
        notes: ((fam?.notes ?? '') + '\n' + note).trim(),
        ...(fam && !fam.email && email ? { email } : {}),
        ...(fam && !fam.phone ? { phone } : {}),
      }).eq('id', familyId)
    } else {
      const surname = parentName.split(/\s+/).slice(-1)[0] || parentName
      await admin.from('families').insert({
        tenant_id: T,
        family_name: surname,
        primary_parent: parentName,
        email: email || null,
        phone,
        source: 'facebook-waitlist',
        lifecycle_stage: 'lead',
        tags: [tag],
        notes: note,
      })
    }

    // the form-fill also lands in the visit log so ad → fill conversion is visible
    await admin.from('site_visits').insert({
      tenant_id: T,
      visitor_id: s(b.visitorId, 80) || null,
      path: `/waitlist/${suburb}#signed-up`,
      source: s(b.utmSource, 60) || 'facebook',
      utm_source: s(b.utmSource, 60) || null,
      utm_campaign: s(b.utmCampaign, 120) || null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('waitlist failed', err)
    return NextResponse.json({ ok: false, error: 'Something went wrong — call us on 0489 188 179.' }, { status: 500 })
  }
}
