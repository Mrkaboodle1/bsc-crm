import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public POST — the website signup popup files everything here right before
// the parent is sent to Stripe's secure checkout: family + kids + class
// enrolments + the signed waiver. Card details NEVER touch this server —
// payment happens entirely on Stripe's own page.
//
// Duplicate protection is the whole point of this route (we have been burned):
//  - family matched by email OR phone before anything is created
//  - students matched by name inside the family before being created
//  - enrolments upserted on (student, class, start_date)

type Kid = { name?: string; dob?: string }
type Body = {
  parentName?: string
  email?: string
  phone?: string
  kids?: Kid[]
  classIds?: string[]
  planLabel?: string
  medical?: string
  consentPhoto?: string
  termsAgreed?: boolean
  signature?: string
}

const s = (v: unknown, n: number) => (v ?? '').toString().trim().slice(0, n)
const digits = (v: string) => v.replace(/\D/g, '')

function brisbaneToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(new Date())
}

export async function POST(req: Request) {
  let b: Body = {}
  try { b = await req.json() } catch { /* ignore */ }

  const parentName = s(b.parentName, 160)
  const email = s(b.email, 200).toLowerCase()
  const phone = s(b.phone, 40)
  const signature = s(b.signature, 400_000)
  const kids = (b.kids ?? []).map((k) => ({ name: s(k.name, 120), dob: s(k.dob, 12) })).filter((k) => k.name)
  const classIds = (b.classIds ?? []).map((c) => s(c, 40)).filter(Boolean).slice(0, 6)
  const planLabel = s(b.planLabel, 120)

  if (!parentName || !email || !phone) return NextResponse.json({ ok: false, error: 'Name, email and phone are required.' }, { status: 400 })
  if (kids.length === 0) return NextResponse.json({ ok: false, error: 'Please add at least one child.' }, { status: 400 })
  if (classIds.length === 0) return NextResponse.json({ ok: false, error: 'Please pick at least one class.' }, { status: 400 })
  if (!signature || b.termsAgreed !== true) return NextResponse.json({ ok: false, error: 'The waiver signature is required.' }, { status: 400 })

  try {
    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'bigstarcircus').maybeSingle()
    if (!tenant) return NextResponse.json({ ok: false, error: 'Setup issue — please call us on 0489 188 179.' }, { status: 500 })
    const T = tenant.id

    // ── Family: find before create. Email first, then phone (last 9 digits). ──
    let familyId: string | null = null
    const { data: byEmail } = await admin.from('families').select('id, primary_parent, email, phone')
      .eq('tenant_id', T).ilike('email', email).limit(1)
    if (byEmail?.length) familyId = byEmail[0]!.id
    if (!familyId && digits(phone).length >= 8) {
      const tail = digits(phone).slice(-9)
      const { data: byPhone } = await admin.from('families').select('id, email')
        .eq('tenant_id', T).ilike('phone', `%${tail}%`).limit(1)
      if (byPhone?.length) familyId = byPhone[0]!.id
    }

    const surname = parentName.split(/\s+/).slice(-1)[0] || parentName
    if (familyId) {
      // fill any gaps, never overwrite what admin already has
      const { data: fam } = await admin.from('families').select('primary_parent, email, phone, tags, notes').eq('id', familyId).maybeSingle()
      const patch: Record<string, unknown> = {}
      if (fam && !fam.primary_parent) patch.primary_parent = parentName
      if (fam && !fam.email) patch.email = email
      if (fam && !fam.phone) patch.phone = phone
      const tags: string[] = (fam?.tags ?? []).filter((t: string) => t !== 'web-signup')
      tags.push('web-signup')
      patch.tags = tags
      if (planLabel) patch.notes = ((fam?.notes ?? '') + `\nWeb signup ${brisbaneToday()}: ${planLabel}`).trim()
      await admin.from('families').update(patch).eq('id', familyId)
    } else {
      const { data: created, error } = await admin.from('families').insert({
        tenant_id: T,
        family_name: surname,
        primary_parent: parentName,
        email,
        phone,
        source: 'website',
        lifecycle_stage: 'trial',
        tags: ['web-signup'],
        notes: planLabel ? `Web signup ${brisbaneToday()}: ${planLabel}` : null,
      }).select('id').single()
      if (error || !created) throw new Error(error?.message ?? 'family insert failed')
      familyId = created.id
    }

    // ── Students: match by name inside the family before creating. ──
    const { data: existingKids } = await admin.from('students').select('id, first_name, last_name').eq('family_id', familyId)
    const norm = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim()
    const studentIds: string[] = []
    for (const kid of kids) {
      const [first, ...rest] = kid.name.split(/\s+/)
      const last = rest.join(' ') || surname
      const match = (existingKids ?? []).find((e) => norm(`${e.first_name} ${e.last_name ?? ''}`) === norm(`${first} ${last}`) || norm(e.first_name) === norm(kid.name))
      if (match) { studentIds.push(match.id); continue }
      const { data: st, error } = await admin.from('students').insert({
        tenant_id: T,
        family_id: familyId,
        first_name: first,
        last_name: last,
        date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(kid.dob) ? kid.dob : null,
      }).select('id').single()
      if (error || !st) throw new Error(error?.message ?? 'student insert failed')
      studentIds.push(st.id)
    }

    // ── Enrolments: every chosen kid into every chosen class, no duplicates. ──
    const today = brisbaneToday()
    for (const studentId of studentIds) {
      for (const classId of classIds) {
        await admin.from('enrolments').upsert({
          tenant_id: T,
          student_id: studentId,
          class_id: classId,
          start_date: today,
          status: 'active',
          notes: planLabel ? `Web signup — ${planLabel}` : 'Web signup',
        }, { onConflict: 'student_id,class_id,start_date', ignoreDuplicates: true })
      }
    }

    // ── Signed waiver, same shape the compliance screen already reads. ──
    await admin.from('signed_waivers').insert({
      tenant_id: T,
      family_id: familyId,
      event_type: 'web-signup',
      parent_name: parentName,
      email,
      phone,
      children: kids.map((k) => k.name).join(', '),
      medical: s(b.medical, 2000) || null,
      consent_photo: s(b.consentPhoto, 20) || null,
      terms_agreed: true,
      signature,
      signed_at: new Date().toISOString(),
      answers: { planLabel, classIds },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('public-signup failed', err)
    return NextResponse.json({ ok: false, error: 'Something went wrong saving your details — please call us on 0489 188 179.' }, { status: 500 })
  }
}
