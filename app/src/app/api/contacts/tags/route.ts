import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/contacts/tags — add or remove a tag on a contact (families row).
// Body: { id, tag, action: 'add' | 'remove' }. Owners + managers only.
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  const tag = String(body.tag ?? '').trim()
  const action = body.action === 'remove' ? 'remove' : 'add'
  if (!id || !tag) return NextResponse.json({ error: 'Missing id or tag' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: row, error: readErr } = await admin
    .from('families').select('tags').eq('id', id).eq('tenant_id', profile.tenant_id).maybeSingle()
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 })
  if (!row) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const current: string[] = Array.isArray(row.tags) ? row.tags : []
  let next: string[]
  if (action === 'add') next = current.includes(tag) ? current : [...current, tag]
  else next = current.filter((t) => t !== tag)

  const { error } = await admin.from('families').update({ tags: next }).eq('id', id).eq('tenant_id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, tags: next })
}
