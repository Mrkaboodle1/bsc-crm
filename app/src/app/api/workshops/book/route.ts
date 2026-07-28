// POST /api/workshops/book — public holiday-workshop booking.
// Member-priority window + capacity + auto-waitlist + lead capture.
// Body: { workshop_id, parent_name, email, phone, child_names }
import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id || !b.parent_name || (!b.email && !b.phone)) {
    return NextResponse.json({ error: 'Please give your name and an email or phone.' }, { status: 400 })
  }
  const sb = await createServerSupabaseAdmin()
  const { data: w } = await sb.from('holiday_workshops').select('*').eq('id', b.workshop_id).maybeSingle()
  if (!w || w.status !== 'open') return NextResponse.json({ error: 'That workshop is not open for booking.' }, { status: 404 })

  // Member match by email or phone.
  const email = String(b.email || '').trim().toLowerCase()
  const phone = String(b.phone || '').replace(/\s/g, '')
  let family: { id: string } | null = null
  if (email) {
    const { data } = await sb.from('families').select('id').eq('tenant_id', w.tenant_id).ilike('email', email).maybeSingle()
    family = data ?? null
  }
  if (!family && phone) {
    const { data } = await sb.from('families').select('id').eq('tenant_id', w.tenant_id).ilike('phone', `%${phone.slice(-8)}%`).maybeSingle()
    family = data ?? null
  }
  const isMember = !!family
  const today = new Date().toISOString().slice(0, 10)
  const membersOnly = !!w.public_opens_at && today < w.public_opens_at

  // Day-switch rule: a member's discount applies ONLY on their regular class day.
  // Any other day during the holidays is full price ($60) — no swapping.
  let isTheirDay = false
  if (isMember && family) {
    const wsDow = new Date(`${w.date}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
    const { data: studs } = await sb.from('students').select('id').eq('family_id', family.id)
    const ids = (studs ?? []).map((s) => s.id)
    if (ids.length) {
      const { data: enrols } = await sb.from('enrolments').select('classes(day_of_week)').in('student_id', ids).eq('status', 'active')
      type ER = { classes: { day_of_week: number } | null }
      const classDays = new Set((enrols as ER[] | null ?? []).flatMap((e) => e.classes ? [e.classes.day_of_week] : []))
      isTheirDay = classDays.has(wsDow)
    }
  }
  // Member price only on their class day; otherwise full public price.
  const priceApplied = isMember && isTheirDay ? Number(w.member_price) : Number(w.public_price)

  // Non-members can't take a confirmed seat during the members-only window → waitlist.
  let status: 'booked' | 'waitlist' = 'booked'
  let reason = ''
  if (!isMember && membersOnly) { status = 'waitlist'; reason = `Members-only until ${w.public_opens_at} — you're on the waitlist and we'll confirm when public booking opens.` }
  else {
    const { count } = await sb.from('workshop_bookings').select('id', { count: 'exact', head: true }).eq('workshop_id', w.id).eq('status', 'booked')
    if ((count ?? 0) >= w.capacity) { status = 'waitlist'; reason = "This day is full — you're on the waitlist and we'll be in touch if a spot opens." }
  }

  const dayNote = isMember && !isTheirDay ? 'Member — different day, full price applies' : null
  const notes = [dayNote, b.notes].filter(Boolean).join(' · ') || null
  const { error } = await sb.from('workshop_bookings').insert({
    tenant_id: w.tenant_id, workshop_id: w.id, family_id: family?.id ?? null,
    parent_name: b.parent_name, email: email || null, phone: b.phone || null,
    child_names: b.child_names || null, is_member: isMember, status,
    source: isMember ? 'member' : 'public_lead', notes,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let msg: string
  if (status !== 'booked') msg = reason
  else if (isMember && isTheirDay) msg = `You're booked in! 🎉 This is your regular class day, so it's included in your membership (member price $${priceApplied.toFixed(0)}).`
  else if (isMember && !isTheirDay) msg = `You're booked in! 🎉 Heads-up: this isn't your regular class day, so it's $${priceApplied.toFixed(0)} (full price) — your member rate only applies on your class day.`
  else msg = `You're booked in! 🎉 $${priceApplied.toFixed(0)} on the day.`

  return NextResponse.json({ ok: true, status, isMember, isTheirDay, price: priceApplied, message: msg })
}
