// /api/incidents/upload — receives a photo/video for an incident report, stores it
// in the private incident-media bucket, and returns a path + a viewing URL.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  const clean = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `${g.tenantId}/${stamp}-${clean}`
  const admin = createAdminSupabase()
  const { error } = await admin.storage.from('incident-media').upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const { data: signed } = await admin.storage.from('incident-media').createSignedUrl(path, 60 * 60 * 24 * 365)
  const type = (file.type || '').startsWith('video') ? 'video' : 'photo'
  return NextResponse.json({ ok: true, media: { type, path, url: signed?.signedUrl || null, name: file.name || clean } })
}
