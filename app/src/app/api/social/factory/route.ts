// /api/social/factory — the Content Factory (typed-brief entry point).
// Turns ONE filming-session brief into N post drafts (BSC TV + RhettStar),
// written to posted_media as status='draft'. Drafts only — never publishes.
// The generation "brain" lives in @/lib/content-factory (shared with the
// Vizard bridge at /api/social/vizard/clips).
//
// POST { brief: string, brands?: ('BSC TV'|'RhettStar')[], count?: number, mediaUrl?: string|null }
// Returns { ok: true, created: number, posts: GeneratedPost[] }

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type BscUser } from '@/lib/dal'
import { generateDrafts, parseBrands, clampCount } from '@/lib/content-factory'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let user: BscUser
  try {
    user = await verifySession()
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (user.role === 'parent') {
    return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const brief = String(body.brief ?? '').trim()
  if (!brief) return NextResponse.json({ error: 'Tell me what happened on filming day (the brief).' }, { status: 400 })
  if (brief.length > 6000) return NextResponse.json({ error: 'Brief too long (max 6000 chars)' }, { status: 400 })

  const result = await generateDrafts({
    brief,
    brands: parseBrands(body.brands),
    count: clampCount(body.count),
    mediaUrl: body.mediaUrl ? String(body.mediaUrl) : null,
    tenantId: user.tenantId,
    userId: user.id,
    businessName: user.tenant?.name || 'BigStar Circus',
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, created: result.created, posts: result.posts })
}
