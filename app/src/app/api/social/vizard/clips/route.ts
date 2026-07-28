// /api/social/vizard/clips — check a Vizard project and, when its clips are
// ready, turn them into post drafts via the shared Content Factory brain.
//
// POST { projectId: string|number, brands?: ('BSC TV'|'RhettStar')[], count?: number, generate?: boolean }
// Returns while processing: { ok: true, status: 'processing' }
// Returns when ready:       { ok: true, status: 'ready', clips: [...], created?, posts? }

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type BscUser } from '@/lib/dal'
import { generateDraftsFromClips, parseBrands } from '@/lib/content-factory'

export const runtime = 'nodejs'
export const maxDuration = 60

const VIZARD_QUERY = 'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/query'

type VizardClip = { videoUrl?: string; clipEditorUrl?: string; title?: string; transcript?: string; viralScore?: number | string; viralReason?: string }

// Vizard's clip array may live under a few keys depending on version.
function extractClips(json: Record<string, unknown>): VizardClip[] {
  const data = (json.data ?? json) as Record<string, unknown>
  const arr = (json.videos ?? json.clips ?? data.videos ?? data.clips) as unknown
  return Array.isArray(arr) ? (arr as VizardClip[]) : []
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

  const projectId = body.projectId
  if (projectId == null || projectId === '') return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // Query Vizard for the project's clips.
  let clips: VizardClip[]
  try {
    const r = await fetch(`${VIZARD_QUERY}/${encodeURIComponent(String(projectId))}`, {
      method: 'GET',
      headers: { 'VIZARDAI_API_KEY': key },
      signal: AbortSignal.timeout(45_000),
    })
    const json = await r.json().catch(() => ({})) as Record<string, unknown>
    if (!r.ok) {
      const msg = (json?.errMsg || json?.message || `Vizard returned ${r.status}`) as string
      return NextResponse.json({ error: String(msg).slice(0, 200) }, { status: 502 })
    }
    clips = extractClips(json)
    // Vizard status codes: 2000=success, 1000=still processing, 4xxx=error.
    const code = Number(json.code ?? (json.data as Record<string, unknown> | undefined)?.code ?? 0)
    if (!clips.length) {
      if (code === 1000 || code === 0) return NextResponse.json({ ok: true, status: 'processing' })
      const errs: Record<number, string> = {
        4001: 'Vizard rejected the API key — we may need to regenerate it.',
        4002: 'Vizard couldn’t clip that video.',
        4003: 'Vizard is rate-limited right now — try again in a minute.',
        4004: 'That video format isn’t supported by Vizard.',
        4005: 'That video link is invalid, or the video is too long.',
        4007: 'Not enough Vizard credits left for that video.',
        4008: 'Vizard couldn’t download that video — make sure the link is public.',
      }
      return NextResponse.json({ error: errs[code] || `Vizard error (code ${code})` }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach Vizard' }, { status: 502 })
  }

  // Clips are ready. Optionally turn them into drafts via the Content Factory.
  const clipsOut = clips.map((c) => ({
    videoUrl: c.videoUrl ?? null,
    editorUrl: c.clipEditorUrl ?? null,
    title: c.title ?? null,
    viralScore: c.viralScore ?? null,
  }))

  if (body.generate === false) {
    return NextResponse.json({ ok: true, status: 'ready', clips: clipsOut })
  }

  const result = await generateDraftsFromClips({
    clips,
    brands: parseBrands(body.brands),
    tenantId: user.tenantId,
    userId: user.id,
    businessName: user.tenant?.name || 'BigStar Circus',
  })

  if (!result.ok) {
    // Clips are ready even if post-generation hiccuped — surface both.
    return NextResponse.json({ ok: true, status: 'ready', clips: clipsOut, genError: result.error })
  }
  return NextResponse.json({ ok: true, status: 'ready', clips: clipsOut, created: result.created, posts: result.posts })
}
