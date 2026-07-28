// /api/rewards/milestones — list reached-but-not-given milestones, and mark one given.
// GET (list due) · POST { id } (mark as handed out)
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { supabase, tenantId: p.tenant_id as string, userId: auth.user.id }
}

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { data, error } = await g.supabase.from('reward_milestones')
    .select('id, milestone, year, reached_at, status, student:students(first_name, last_name, family:families(primary_parent, family_name))')
    .eq('tenant_id', g.tenantId).eq('status', 'reached').order('reached_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await g.supabase.from('reward_milestones')
    .update({ status: 'given', given_at: new Date().toISOString(), given_by: g.userId })
    .eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
