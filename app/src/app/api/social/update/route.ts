import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const ALLOWED_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'threads']

// POST /api/social/update
// { id, caption?, mediaUrl?, scheduledFor?, status?, platforms?: string[] }
// Edits a planned/draft/scheduled post. If `platforms` has more than one, the
// first becomes this post's platform and a copy is created for each extra one.
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if ('caption' in body) patch.caption = (body.caption || '').trim() || null
  if ('mediaUrl' in body) patch.media_url = body.mediaUrl || null
  if ('scheduledFor' in body) patch.scheduled_for = body.scheduledFor || null
  if ('status' in body && ['draft', 'scheduled', 'posted'].includes(body.status)) patch.status = body.status

  const platforms: string[] = Array.isArray(body.platforms)
    ? body.platforms.filter((p: unknown): p is string => typeof p === 'string' && ALLOWED_PLATFORMS.includes(p))
    : []
  if (platforms.length) patch.platform = platforms[0]

  // Keep status/scheduled_for consistent: a post with a future schedule is 'scheduled'.
  if (patch.scheduled_for && !('status' in patch)) patch.status = 'scheduled'
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase
    .from('posted_media')
    .update(patch)
    .eq('id', body.id)
    .eq('tenant_id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Duplicate the post for any extra platforms chosen.
  if (platforms.length > 1) {
    const { data: row } = await supabase
      .from('posted_media')
      .select('caption, media_url, media_kind, status, scheduled_for')
      .eq('id', body.id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (row) {
      const copies = platforms.slice(1).map((platform) => ({
        tenant_id: profile.tenant_id,
        caption: row.caption,
        media_url: row.media_url,
        media_kind: row.media_kind || 'upload',
        platform,
        status: row.status || 'draft',
        scheduled_for: row.scheduled_for,
        posted_by_user_id: auth.user.id,
      }))
      await supabase.from('posted_media').insert(copies)
    }
  }

  return NextResponse.json({ ok: true })
}
