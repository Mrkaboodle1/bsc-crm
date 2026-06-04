import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase, CREDENTIALS_BUCKET, CREDENTIAL_TYPES } from '@/lib/supabase-admin'

// POST /api/credentials/upload — a coach uploads one credential file.
// We authorise via their session, resolve their coach record, then store the
// file in the private bucket under their coach id. Optional expiry updates the
// matching coaches column so the 2-week renewal warning works.

export async function POST(req: Request) {
  // 1. Who is this?
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data: coach } = await admin
    .from('coaches')
    .select('id, tenant_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  if (!coach) return NextResponse.json({ error: 'No coach profile linked to this login' }, { status: 403 })

  // 2. Read the upload
  const form = await req.formData()
  const file = form.get('file')
  const type = String(form.get('type') || 'other')
  const expiry = String(form.get('expiry') || '').trim()
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Please choose a file' }, { status: 400 })
  }
  const typeDef = CREDENTIAL_TYPES.find((t) => t.value === type) ?? CREDENTIAL_TYPES.find((t) => t.value === 'other')!

  // 3. Store it privately under the coach's folder
  const extMatch = file.name.match(/\.([a-z0-9]+)$/i)
  const ext = extMatch ? extMatch[1].toLowerCase() : 'bin'
  const path = `${coach.id}/${typeDef.value}-${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from(CREDENTIALS_BUCKET)
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (upErr) {
    return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 400 })
  }

  // 4. If an expiry was given and this credential has an expiry column, save it
  if (expiry && typeDef.expiryCol) {
    await admin.from('coaches').update({ [typeDef.expiryCol]: expiry }).eq('id', coach.id)
  }

  return NextResponse.json({ ok: true })
}
