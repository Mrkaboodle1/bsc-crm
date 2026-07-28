import { NextResponse } from 'next/server'
import { createAdminSupabase, CREDENTIALS_BUCKET } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/coach-onboarding/upload — PUBLIC (token-gated). Stores ONE file so
// the sign-up never sends all the photos in a single big request (which fails).
export async function POST(req: Request) {
  try {
    const admin = createAdminSupabase()
    const form = await req.formData()
    const token = String(form.get('token') || '').trim()
    const type = String(form.get('type') || 'other').replace(/[^a-z_]/gi, '').slice(0, 30) || 'other'
    const file = form.get('file')
    if (!token) return NextResponse.json({ error: 'Missing link' }, { status: 400 })
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'That file is too big (max 25MB). Try a photo instead of a scan.' }, { status: 400 })

    const { data: invite } = await admin.from('coach_invites').select('id, status').eq('token', token).maybeSingle()
    if (!invite || invite.status === 'submitted') return NextResponse.json({ error: 'This sign-up link is no longer valid.' }, { status: 403 })

    const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'bin').toLowerCase()
    const path = `pending/${token}/${type}-${Date.now()}-${Math.floor(file.size % 100000)}.${ext}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error } = await admin.storage.from(CREDENTIALS_BUCKET).upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: true })
    if (error) return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 400 })
    return NextResponse.json({ ok: true, path })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Upload error' }, { status: 500 })
  }
}
