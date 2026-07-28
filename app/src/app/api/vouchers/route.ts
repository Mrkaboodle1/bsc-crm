// /api/vouchers — CRUD for the Play On Vouchers tracker.
// Owner/manager only. Tenant-scoped via the signed-in user.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

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
  return NextResponse.json({ vouchers: data ?? [] })
}

export async function POST(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  const { data, error } = await c.admin.from('play_on_vouchers').insert({ ...pick(b), tenant_id: c.tenantId }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Every logged voucher automatically books the follow-up: when the voucher's
  // covered weeks run out, admin must set up a paid subscription for next term.
  // The kids keep their enrolments, so they stay on the roll either way.
  const who = [data.family_name, data.student_name].filter(Boolean).join(' / ') || 'Voucher family'
  const dueDate = data.term_end || null
  await c.admin.from('tasks').insert({
    tenant_id: c.tenantId,
    title: `${who}: Play On voucher runs out — set up next term's subscription`,
    description: `Voucher ${data.voucher_ref || ''} ($${data.amount}) covers ${data.weeks} weeks${data.term_end ? `, ending ${data.term_end}` : ''}. Before the next term starts, create their paid subscription in Stripe — the child is already enrolled, so they stay on the roll automatically. Logged from the Play On Vouchers page.`,
    due_at: dueDate,
    priority: 'high',
    status: 'open',
    related_family_id: data.family_id || null,
    created_by_user_id: c.userId,
    assigned_to_user_id: c.userId,
  })

  return NextResponse.json({ voucher: data })
}

export async function PATCH(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data, error } = await c.admin.from('play_on_vouchers').update(pick(b)).eq('id', b.id).eq('tenant_id', c.tenantId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ voucher: data })
}

export async function DELETE(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await c.admin.from('play_on_vouchers').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
