// /api/finance/repeating — repeating (recurring) invoice templates. Owner/manager.
// GET (list) · POST (create) · PATCH {id,...} (edit / pause / resume) · DELETE (?id)
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

function clean(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  if ('contact_name' in b) out.contact_name = String(b.contact_name || '').slice(0, 200) || null
  if ('contact_email' in b) out.contact_email = String(b.contact_email || '').slice(0, 200) || null
  if ('reference' in b) out.reference = String(b.reference || '').slice(0, 120) || null
  if ('amounts_are' in b) out.amounts_are = ['exclusive', 'inclusive', 'none'].includes(String(b.amounts_are)) ? b.amounts_are : 'exclusive'
  if ('lines' in b) out.lines = Array.isArray(b.lines) ? b.lines : []
  if ('frequency' in b) out.frequency = ['weekly', 'fortnightly', 'monthly'].includes(String(b.frequency)) ? b.frequency : 'weekly'
  if ('due_days' in b) out.due_days = Math.max(0, Math.min(120, Number(b.due_days) || 0))
  if ('next_date' in b) out.next_date = b.next_date || null
  if ('end_date' in b) out.end_date = b.end_date || null
  if ('mode' in b) out.mode = ['draft', 'approve', 'send'].includes(String(b.mode)) ? b.mode : 'draft'
  if ('active' in b) out.active = !!b.active
  return out
}

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('bs_repeating_invoices').select('*').eq('tenant_id', g.tenantId).order('created_at', { ascending: false })
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ ok: true, missing: true, rows: [] })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const c = clean(b)
  if (!Array.isArray(c.lines) || (c.lines as unknown[]).length === 0) return NextResponse.json({ error: 'Add at least one line' }, { status: 400 })
  if (!c.next_date) return NextResponse.json({ error: 'Pick the first invoice date' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('bs_repeating_invoices').insert({ tenant_id: g.tenantId, ...c }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('bs_repeating_invoices').update(clean(b)).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  await admin.from('bs_repeating_invoices').delete().eq('id', id).eq('tenant_id', g.tenantId)
  return NextResponse.json({ ok: true })
}
