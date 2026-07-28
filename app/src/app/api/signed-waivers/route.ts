// /api/signed-waivers — delete a signed-waiver record (owner/manager only).
// Exists mainly to clean duplicate rows created by the Tectonic import;
// genuine waivers are legal records and should stay put.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Only admin can delete waivers' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('signed_waivers').delete().eq('id', id).eq('tenant_id', p.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
