// /api/social/bigstar-tv/save — save the clips Rhett TICKED.
// Nothing from the Big Star TV engine reaches the Calendar until it comes
// through here, so he reviews first and only keeps the ones he likes.
//
// POST { clips: [{ publicPath, caption, platforms: string[], scheduledFor?: ISO }] }
// Returns { ok, created }

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type BscUser } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const ALLOWED = ['instagram', 'facebook', 'tiktok', 'threads']

export async function POST(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const clips = Array.isArray(body.clips) ? body.clips as Array<Record<string, unknown>> : []
  if (!clips.length) return NextResponse.json({ error: 'Tick at least one clip to keep.' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const rows: Array<Record<string, unknown>> = []

  for (const c of clips) {
    const publicPath = String(c.publicPath ?? '')
    const caption = String(c.caption ?? '').trim()
    if (!publicPath) continue

    const platforms = (Array.isArray(c.platforms) ? c.platforms : [])
      .map(String).filter((p) => ALLOWED.includes(p))
    if (!platforms.length) platforms.push('instagram')

    const scheduledFor = c.scheduledFor ? String(c.scheduledFor) : null

    // One row per platform — that's how posted_media works.
    for (const platform of platforms) {
      rows.push({
        tenant_id: user.tenantId,
        caption: caption || null,
        media_url: appUrl ? `${appUrl}${publicPath}` : publicPath,
        media_kind: 'upload',
        platform,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: scheduledFor,
        posted_by_user_id: user.id,
      })
    }
  }

  if (!rows.length) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('posted_media').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, created: rows.length })
}
