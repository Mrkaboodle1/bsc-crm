// /api/stars — undo a star award from the ledger. Owner/manager only.
// Undo strategy: insert a negative "adjustment" entry so the same DB trigger
// that maintains total_stars / star_tier on award also handles the reversal.
// If the table refuses negative rows, fall back to deleting the entry and
// recomputing the student's total from the remaining ledger.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Only admin can undo stars', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()

  const { data: row } = await admin.from('star_ledger').select('id, student_id, stars, reason, created_at')
    .eq('id', id).eq('tenant_id', g.tenantId).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Star entry not found' }, { status: 404 })
  if (row.stars < 0) return NextResponse.json({ error: 'This is already an undo entry' }, { status: 400 })

  // Preferred path: reversing entry via the same trigger that awarded it.
  const { error: negErr } = await admin.from('star_ledger').insert({
    tenant_id: g.tenantId,
    student_id: row.student_id,
    stars: -row.stars,
    reason: row.reason,
    notes: `UNDO of award from ${String(row.created_at).slice(0, 10)}`,
  })
  if (!negErr) return NextResponse.json({ ok: true, mode: 'reversed' })

  // Fallback: hard delete + recompute the total from what's left.
  const { error: delErr } = await admin.from('star_ledger').delete().eq('id', row.id).eq('tenant_id', g.tenantId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })
  const { data: rest } = await admin.from('star_ledger').select('stars').eq('student_id', row.student_id).eq('tenant_id', g.tenantId)
  const total = (rest ?? []).reduce((s, x) => s + (x.stars || 0), 0)
  await admin.from('students').update({ total_stars: total }).eq('id', row.student_id).eq('tenant_id', g.tenantId)
  return NextResponse.json({ ok: true, mode: 'deleted', newTotal: total })
}
