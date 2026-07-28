// /api/social/bigstar-tv/music — find and download royalty-free music from
// Jamendo straight into the Big Star TV music library.
//
// SAFETY: BigStar's videos are commercial use, so we ONLY take tracks that
//   (a) the artist allows downloading, and
//   (b) carry a licence permitting COMMERCIAL use (CC-BY / CC-BY-SA).
// Non-commercial (NC) and no-derivatives (ND) tracks are excluded.
// Attribution is still required — we save it to CREDITS.txt.
//
// GET  → list what's in the library
// POST { vibe: "energetic circus fun", count?: 5 } → fetch matching tracks

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifySession, type BscUser } from '@/lib/dal'
import { listMusic } from '@/lib/clip-builder'

export const runtime = 'nodejs'
export const maxDuration = 300

const MUSIC_DIR = join(process.cwd(), 'public', 'bigstar-music')
const JAMENDO = 'https://api.jamendo.com/v3.0/tracks'

type JamendoTrack = {
  name?: string
  artist_name?: string
  audiodownload?: string
  audio?: string
  audiodownload_allowed?: boolean
  license_ccurl?: string
  musicinfo?: { tags?: { genres?: string[]; vartags?: string[] } }
  shareurl?: string
}

/** Commercial use is only OK when the licence has no "nc" (non-commercial) part. */
function allowsCommercialUse(licenceUrl?: string): boolean {
  if (!licenceUrl) return false
  const u = licenceUrl.toLowerCase()
  if (!u.includes('creativecommons.org')) return false
  if (u.includes('/by-nc') || u.includes('-nc-') || u.includes('/nc/')) return false
  return u.includes('/by') || u.includes('/zero') || u.includes('publicdomain')
}

/** Make a descriptive filename — the vibe-matcher reads these. */
function safeName(vibe: string, t: JamendoTrack, i: number): string {
  const tags = [...(t.musicinfo?.tags?.genres ?? []), ...(t.musicinfo?.tags?.vartags ?? [])].slice(0, 3)
  const words = [...vibe.toLowerCase().split(/\s+/).slice(0, 3), ...tags, t.name ?? `track${i}`]
    .join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `${words.slice(0, 70)}.mp3`
}

export async function GET() {
  try { await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  return NextResponse.json({ ok: true, tracks: await listMusic() })
}

export async function POST(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  const clientId = process.env.JAMENDO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({
      error: 'The music finder isn’t connected yet — it needs a free Jamendo client ID (2-minute signup at developer.jamendo.com).',
    }, { status: 503 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const vibe = String(body.vibe ?? '').trim().slice(0, 100)
  if (!vibe) return NextResponse.json({ error: 'Describe the music you want, e.g. "energetic circus fun".' }, { status: 400 })
  const want = Math.min(8, Math.max(1, Number(body.count ?? 4)))

  // Ask for extra, since we filter hard on licence + downloadability.
  const url = new URL(JAMENDO)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(want * 6))
  url.searchParams.set('search', vibe)
  url.searchParams.set('include', 'musicinfo+licenses')
  url.searchParams.set('audioformat', 'mp32')
  url.searchParams.set('audiodlformat', 'mp32')
  url.searchParams.set('order', 'popularity_total')
  // Jamendo's own filter for commercial-use-permitted licences.
  url.searchParams.set('ccnc', 'false')
  url.searchParams.set('ccnd', 'false')

  let tracks: JamendoTrack[]
  try {
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(30_000) })
    const j = await r.json() as { results?: JamendoTrack[]; headers?: { error_message?: string } }
    if (!r.ok || j.headers?.error_message) {
      return NextResponse.json({ error: j.headers?.error_message || `Jamendo returned ${r.status}` }, { status: 502 })
    }
    tracks = j.results ?? []
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach Jamendo' }, { status: 502 })
  }

  // Belt and braces: re-check the licence ourselves, don't just trust the filter.
  const safe = tracks.filter((t) => (t.audiodownload_allowed !== false) && allowsCommercialUse(t.license_ccurl) && (t.audiodownload || t.audio))
  if (!safe.length) {
    return NextResponse.json({ error: `No commercially-safe tracks found for "${vibe}". Try simpler words like "upbeat" or "happy".` }, { status: 404 })
  }

  await mkdir(MUSIC_DIR, { recursive: true })
  const added: Array<{ file: string; credit: string }> = []

  for (const t of safe) {
    if (added.length >= want) break
    const src = t.audiodownload || t.audio
    if (!src) continue
    try {
      const a = await fetch(src, { signal: AbortSignal.timeout(60_000) })
      if (!a.ok) continue
      const buf = Buffer.from(await a.arrayBuffer())
      if (buf.length < 200_000) continue // too small to be a real track
      const file = safeName(vibe, t, added.length)
      await writeFile(join(MUSIC_DIR, file), buf)
      added.push({ file, credit: `${file} — "${t.name}" by ${t.artist_name} (${t.license_ccurl}) ${t.shareurl ?? ''}`.trim() })
    } catch { /* skip this one */ }
  }

  if (!added.length) return NextResponse.json({ error: 'Found tracks but none downloaded cleanly. Try again.' }, { status: 502 })

  // Attribution is a licence condition — keep a running record.
  await appendFile(join(MUSIC_DIR, 'CREDITS.txt'),
    `\n# Added ${new Date().toISOString().slice(0, 10)} for vibe "${vibe}"\n` +
    added.map((a) => a.credit).join('\n') + '\n',
    'utf8').catch(() => {})

  return NextResponse.json({
    ok: true,
    added: added.length,
    files: added.map((a) => a.file),
    note: 'These are Creative Commons tracks that allow commercial use. Credit the artist in your caption — see CREDITS.txt in the music folder.',
    tracks: await listMusic(),
  })
}
