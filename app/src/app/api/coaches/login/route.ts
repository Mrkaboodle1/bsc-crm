// POST /api/coaches/login — create or reset a coach's tablet login.
// Body: { coach_id, password }. Owner/manager only.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: me } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!me?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(me.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const password = String(body.password || '')
  if (!body.coach_id) return NextResponse.json({ error: 'Missing coach' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: coach } = await admin.from('coaches').select('id, full_name, email, tenant_id').eq('id', body.coach_id).eq('tenant_id', me.tenant_id).maybeSingle()
  if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
  if (!coach.email) return NextResponse.json({ error: 'Add an email address to this coach first, then set their login.' }, { status: 400 })
  const email = coach.email.toLowerCase()

  // Find existing auth user by email (paginate), else create.
  let userId: string | null = null
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const found = data?.users?.find((u) => (u.email || '').toLowerCase() === email)
    if (found) userId = found.id
    if (!data || (data.users?.length ?? 0) < 200) break
  }

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !created?.user) return NextResponse.json({ error: error?.message || 'Could not create login' }, { status: 400 })
    userId = created.user.id
  }

  // Ensure a public.users profile (role coach) + link the coach record.
  await admin.from('users').upsert({ id: userId, tenant_id: me.tenant_id, email, full_name: coach.full_name, role: 'coach' }, { onConflict: 'id' })
  await admin.from('coaches').update({ user_id: userId }).eq('id', coach.id)

  return NextResponse.json({ ok: true, email })
}
