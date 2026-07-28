// /api/youtube/search?q= — search YouTube for songs to add to a playlist.
// Uses YOUTUBE_API_KEY (YouTube Data API v3). Coach-accessible.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager', 'coach', 'support'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const KEY = process.env.YOUTUBE_API_KEY
  if (!KEY) return NextResponse.json({ error: 'YouTube isn’t connected yet — ask Rhett to add the YouTube key.' }, { status: 503 })

  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ ok: true, results: [] })

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=12&q=${encodeURIComponent(q)}&key=${KEY}`
  try {
    const r = await fetch(url)
    const j = await r.json()
    if (!r.ok) return NextResponse.json({ error: j?.error?.message || 'YouTube search failed' }, { status: 502 })
    type Item = { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { default?: { url?: string } } } }
    const results = (j.items as Item[] ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({ videoId: it.id!.videoId!, title: it.snippet?.title || 'Untitled', channel: it.snippet?.channelTitle || '', thumb: it.snippet?.thumbnails?.default?.url || '' }))
    return NextResponse.json({ ok: true, results })
  } catch {
    return NextResponse.json({ error: 'Could not reach YouTube' }, { status: 502 })
  }
}
