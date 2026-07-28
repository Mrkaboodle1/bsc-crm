// /api/playlists — coach-built studio playlists. Coach-accessible.
// GET (list) · POST {name} · PATCH {id, name?, tracks?} · DELETE (?id)
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
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

type Track = { title: string; url: string; yt?: string }
const cleanTracks = (v: unknown): Track[] => Array.isArray(v) ? v.map((t) => {
  const tt = t as Track
  const out: Track = { title: String(tt.title || 'Track'), url: String(tt.url || '') }
  if (tt.yt) out.yt = String(tt.yt)
  return out
}).filter((t) => t.url) : []

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('playlists').select('id, name, tracks').eq('tenant_id', g.tenantId).order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.name?.trim()) return NextResponse.json({ error: 'Give the playlist a name' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('playlists').insert({ tenant_id: g.tenantId, name: b.name.trim(), tracks: cleanTracks(b.tracks) }).select('id, name, tracks').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, playlist: data })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('name' in b) patch.name = String(b.name || '').trim() || 'Playlist'
  if ('tracks' in b) patch.tracks = cleanTracks(b.tracks)
  const admin = createAdminSupabase()
  const { error } = await admin.from('playlists').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('playlists').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
