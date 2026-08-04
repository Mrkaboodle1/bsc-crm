// /api/vouchers — CRUD for the Play On Vouchers tracker.
// Owner/manager only. Tenant-scoped via the signed-in user.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { attachVoucherClasses } from '@/lib/voucher-classes'
import { termFor } from '@/lib/qld-terms'

// When a class is picked while logging the voucher, put the child straight onto
// that class's roll: find (or create) the student inside the matched family and
// create the enrolment. Conservative on purpose — without a family match we
// refuse to guess and tell the admin to add the child by hand instead.
async function enrolFromVoucher(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, b: {
  class_id?: string | null; family_id?: string | null; student_name?: string | null
  child_dob?: string | null; redeemed_on?: string | null
}): Promise<{ enrolled?: string; enrol_warning?: string }> {
  const classId = String(b.class_id || '').trim()
  if (!classId) return {}
  const { data: cls } = await admin.from('classes').select('id, name').eq('tenant_id', tenantId).eq('id', classId).maybeSingle()
  if (!cls) return { enrol_warning: 'That class could not be found — the child was NOT added to a roll.' }
  const name = String(b.student_name || '').trim()
  const first = name.split(/\s+/)[0]
  if (!b.family_id || !first) return { enrol_warning: `No matched family for ${name || 'this child'}, so they were NOT added to ${cls.name} — add them from the class roll page.` }

  const { data: kids } = await admin.from('students').select('id, first_name, last_name')
    .eq('tenant_id', tenantId).eq('family_id', b.family_id).ilike('first_name', first)
  let studentId: string | null = kids?.length === 1 ? kids[0].id : null
  if ((kids?.length ?? 0) > 1) {
    const last = name.split(/\s+/).slice(1).join(' ').toLowerCase()
    const exact = (kids ?? []).filter((k) => (k.last_name || '').toLowerCase() === last)
    if (exact.length === 1) studentId = exact[0].id
    else return { enrol_warning: `Two kids called ${first} in this family — add the right one to ${cls.name} from the class roll page.` }
  }
  if (!studentId) {
    const parts = name.split(/\s+/)
    const { data: made, error } = await admin.from('students').insert({
      tenant_id: tenantId, family_id: b.family_id, first_name: parts[0],
      last_name: parts.slice(1).join(' ') || null,
      date_of_birth: b.child_dob && /^\d{4}-\d{2}-\d{2}$/.test(String(b.child_dob)) ? b.child_dob : null,
    }).select('id').single()
    if (error || !made) return { enrol_warning: `Could not create a student record for ${name} — add them to ${cls.name} by hand.` }
    studentId = made.id
  }

  const { data: existing } = await admin.from('enrolments').select('id, status')
    .eq('tenant_id', tenantId).eq('student_id', studentId).eq('class_id', classId)
  if ((existing ?? []).some((e) => ['active', 'trial'].includes(String(e.status)))) return { enrolled: cls.name }

  const start = b.redeemed_on && /^\d{4}-\d{2}-\d{2}$/.test(String(b.redeemed_on)) ? String(b.redeemed_on) : new Date().toISOString().slice(0, 10)
  const t = termFor(start)
  const { error: enrolErr } = await admin.from('enrolments').insert({
    tenant_id: tenantId, student_id: studentId, class_id: classId, start_date: start,
    status: 'active', term: t ? t.label.replace(/^Term\s+/, 'T') : null, notes: 'Play On voucher',
  })
  if (enrolErr) return { enrol_warning: `Could not add ${name} to ${cls.name}: ${enrolErr.message}` }
  return { enrolled: cls.name }
}

export const runtime = 'nodejs'

async function ctx() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string, userId: auth.user.id, admin: createAdminSupabase() }
}

const FIELDS = ['family_id', 'family_name', 'student_name', 'voucher_ref', 'amount', 'weekly_value', 'weeks', 'redeemed_on', 'term_start', 'term_end', 'status', 'notes', 'use_type', 'photo_url'] as const
function pick(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of FIELDS) if (k in b) out[k] = b[k]
  return out
}

export async function GET() {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const { data, error } = await c.admin.from('play_on_vouchers').select('*').eq('tenant_id', c.tenantId).order('term_end', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, vouchers: [] }, { status: 200 })
  const rows = await attachVoucherClasses(c.admin, c.tenantId, data ?? [])
  return NextResponse.json({ vouchers: rows })
}

export async function POST(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  const { data, error } = await c.admin.from('play_on_vouchers').insert({ ...pick(b), tenant_id: c.tenantId }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // The government voucher prints the child's date of birth — bank it on the
  // student record so birthdays are known (Rhett wants birthday emails one
  // day). Only fills a BLANK date_of_birth on a first-name match inside the
  // matched family — never overwrites, never guesses across families.
  if (b.child_dob && b.family_id && b.student_name && /^\d{4}-\d{2}-\d{2}$/.test(String(b.child_dob))) {
    const first = String(b.student_name).trim().split(/\s+/)[0]
    if (first) {
      const { data: kids } = await c.admin.from('students')
        .select('id, first_name, date_of_birth')
        .eq('tenant_id', c.tenantId).eq('family_id', b.family_id).ilike('first_name', first)
      if (kids?.length === 1 && !kids[0].date_of_birth) {
        await c.admin.from('students').update({ date_of_birth: b.child_dob }).eq('id', kids[0].id)
      }
    }
  }

  // If a class was picked on the form, enrol the child now so they land on
  // that class's roll immediately.
  const enrol = await enrolFromVoucher(c.admin, c.tenantId, b)

  // Every logged voucher automatically books the follow-up: when the voucher's
  // covered weeks run out, admin must set up a paid subscription for next term.
  // The kids keep their enrolments, so they stay on the roll either way.
  const who = [data.family_name, data.student_name].filter(Boolean).join(' / ') || 'Voucher family'
  const dueDate = data.term_end || null
  await c.admin.from('tasks').insert({
    tenant_id: c.tenantId,
    title: `${who}: Play On voucher runs out — set up next term's subscription`,
    description: `Voucher ${data.voucher_ref || ''} ($${data.amount}) covers ${data.weeks} weeks${data.term_end ? `, ending ${data.term_end}` : ''}.${enrol.enrolled ? ` Class: ${enrol.enrolled}.` : ''} Before next term starts: if this family already HAD a subscription it was paused for the voucher and auto-resumes — CONFIRM the resume actually happened in Stripe. If they are a NEW family, CREATE their subscription. The child is already enrolled either way, so they stay on the roll. Logged from the Play On Vouchers page.`,
    due_at: dueDate,
    priority: 'high',
    status: 'open',
    related_family_id: data.family_id || null,
    created_by_user_id: c.userId,
    assigned_to_user_id: c.userId,
  })

  return NextResponse.json({ voucher: data, ...enrol })
}

export async function PATCH(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data, error } = await c.admin.from('play_on_vouchers').update(pick(b)).eq('id', b.id).eq('tenant_id', c.tenantId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Picking a class while editing an already-logged voucher enrols the child too.
  const enrol = await enrolFromVoucher(c.admin, c.tenantId, {
    class_id: b.class_id,
    family_id: b.family_id ?? data.family_id,
    student_name: b.student_name ?? data.student_name,
    child_dob: b.child_dob,
    redeemed_on: b.redeemed_on ?? data.redeemed_on,
  })
  return NextResponse.json({ voucher: data, ...enrol })
}

export async function DELETE(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await c.admin.from('play_on_vouchers').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
