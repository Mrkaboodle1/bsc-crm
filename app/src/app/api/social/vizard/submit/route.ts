// /api/social/vizard/submit — send a long video to Vizard for clipping.
// Vizard cuts it into vertical short clips (async, takes a few minutes).
// Returns a projectId; poll /api/social/vizard/clips with it to fetch results.
//
// POST { videoUrl: string, lang?: string }
// Returns { ok: true, projectId: string|number }

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type BscUser } from '@/lib/dal'

export const runtime = 'nodejs'
export const maxDuration = 60

const VIZARD_CREATE = 'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/create'

// Dropbox share links serve an HTML preview by default — rewrite to a direct
// download (dl=1) so Vizard can fetch the actual file (as a direct file URL).
function normalizeUrl(url: string): string {
  if (/dropbox\.com/i.test(url)) {
    let u = url.replace(/([?&])dl=0/i, '$1dl=1')
    if (!/[?&]dl=1/i.test(u)) u += (u.includes('?') ? '&' : '?') + 'dl=1'
    return u
  }
  return url
}

// Vizard videoType codes by source. YouTube = 2 is confirmed in Vizard's docs;
// others are best-effort and can be corrected after a live test.
function videoTypeFor(url: string): { videoType: number; ext?: string } {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { videoType: 2 }
  if (u.includes('drive.google.com')) return { videoType: 3 }
  if (u.includes('vimeo.com')) return { videoType: 4 }
  // default: treat as a direct remote video file (videoType 1 needs an ext)
  const m = u.match(/\.(mp4|mov|m4v|webm|mkv)(\?|$)/)
  return { videoType: 1, ext: m ? m[1] : 'mp4' }
}

export async function POST(req: NextRequest) {
  let user: BscUser
  try {
    user = await verifySession()
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  const key = process.env.VIZARD_API_KEY
  if (!key) return NextResponse.json({ error: 'Vizard is not connected on the server.' }, { status: 503 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const videoUrl = String(body.videoUrl ?? '').trim()
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    return NextResponse.json({ error: 'Paste a valid video link (YouTube, Google Drive, Vimeo, or a direct video URL).' }, { status: 400 })
  }

  const url = normalizeUrl(videoUrl)
  const { videoType, ext } = videoTypeFor(url)
  const payload: Record<string, unknown> = {
    videoUrl: url,
    videoType,
    lang: String(body.lang ?? 'en'),
    preferLength: [0], // 0 = auto (let Vizard choose the best clip lengths)
    ...(ext ? { ext } : {}),
  }

  try {
    const r = await fetch(VIZARD_CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'VIZARDAI_API_KEY': key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    })
    const json = await r.json().catch(() => ({})) as Record<string, unknown>
    if (!r.ok) {
      const msg = (json?.errMsg || json?.message || `Vizard returned ${r.status}`) as string
      return NextResponse.json({ error: String(msg).slice(0, 200) }, { status: 502 })
    }
    // projectId may sit at top level or under data
    const data = (json.data ?? json) as Record<string, unknown>
    const projectId = data.projectId ?? json.projectId
    if (!projectId) {
      const msg = (json.errMsg || json.message || 'Vizard did not return a project id') as string
      return NextResponse.json({ error: String(msg).slice(0, 200) }, { status: 502 })
    }
    return NextResponse.json({ ok: true, projectId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach Vizard' }, { status: 502 })
  }
}
