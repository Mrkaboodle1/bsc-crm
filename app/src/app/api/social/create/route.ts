import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// POST /api/social/create
// { caption, platforms: string[], mediaUrl?, when: 'now'|'schedule'|'draft', scheduledFor? }
// Creates one posted_media row per selected platform.
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const caption: string = (body.caption || '').trim()
  const platforms: string[] = Array.isArray(body.platforms) ? body.platforms : []
  const mediaUrl: string | null = body.mediaUrl || null
  const when: string = body.when || 'draft'
  const scheduledFor: string | null = body.scheduledFor || null

  if (!caption && !mediaUrl) return NextResponse.json({ error: 'Add a caption or an image' }, { status: 400 })
  if (platforms.length === 0) return NextResponse.json({ error: 'Pick at least one channel' }, { status: 400 })
  if (when === 'schedule' && !scheduledFor) return NextResponse.json({ error: 'Pick a date & time to schedule' }, { status: 400 })

  const status = when === 'now' ? 'posted' : when === 'schedule' ? 'scheduled' : 'draft'
  const nowIso = new Date().toISOString()
  const rows = platforms.map((platform) => ({
    tenant_id: profile.tenant_id,
    caption: caption || null,
    media_url: mediaUrl,
    media_kind: mediaUrl ? 'ai_generated' : 'upload',
    platform,
    status,
    scheduled_for: when === 'schedule' ? scheduledFor : null,
    posted_at: when === 'now' ? nowIso : null,
    posted_by_user_id: auth.user.id,
  }))

  const { error } = await supabase.from('posted_media').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, created: rows.length })
}
