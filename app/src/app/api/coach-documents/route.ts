import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase, CREDENTIALS_BUCKET } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Who is this, and which coach records may they touch? A coach may edit their
// own documents; owner/manager may edit anyone's.
async function ctx() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return null
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return null
  const admin = createAdminSupabase()
  const { data: myCoach } = await admin.from('coaches').select('id').eq('user_id', auth.user.id).maybeSingle()
  return { tenantId: p.tenant_id as string, role: p.role as string, myCoachId: myCoach?.id ?? null, admin }
}
function allowed(c: { role: string; myCoachId: string | null }, docCoachId: string) {
  return ['owner', 'manager'].includes(c.role) || c.myCoachId === docCoachId
}

export async function PATCH(req: Request) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data: doc } = await c.admin.from('coach_documents').select('coach_id').eq('id', b.id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc || !allowed(c, doc.coach_id)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const patch: Record<string, unknown> = {}
  if ('expiry_on' in b) patch.expiry_on = b.expiry_on || null
  if ('label' in b) patch.label = b.label || null
  if ('reset_reminder' in b && b.reset_reminder) patch.reminder_sent_on = null
  const { error } = await c.admin.from('coach_documents').update(patch).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data: doc } = await c.admin.from('coach_documents').select('coach_id, file_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc || !allowed(c, doc.coach_id)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (doc.file_path) { try { await c.admin.storage.from(CREDENTIALS_BUCKET).remove([doc.file_path]) } catch { /* ignore */ } }
  const { error } = await c.admin.from('coach_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
