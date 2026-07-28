// /api/social/bigstar-tv — THE BIG STAR TV ENGINE ("our own Creatify").
//
//   your footage
//        ↓  👁️  Gemini WATCHES it → best moments + hook + CTA + score
//        ↓  🎬  FFmpeg cuts each moment → vertical + hook overlay + CTA + music
//        ↓  ✍️  Content Factory writes the SEO caption/hashtags per clip
//        ↓  📥  lands in posted_media as a DRAFT for Rhett to approve
//
// Nothing publishes. Drafts only.
//
// POST { videoPath: string | string[], maxClips?: number, withMusic?: boolean }
//   videoPath = one file on this machine, or several (a whole filming day).
//   maxClips is PER VIDEO.
// Returns { ok, clips: [{ publicPath, hook, cta, viralScore, brand, caption }] }

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'node:fs'
import { verifySession, type BscUser } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { findMoments, type VideoMoment } from '@/lib/gemini-video'
import { buildClip, type AudioMode } from '@/lib/clip-builder'

export const runtime = 'nodejs'
export const maxDuration = 300  // Hobby plan hard limit (was 800 — blocked every deploy)

type Built = VideoMoment & { publicPath: string; caption: string; platform: string; sourcePath: string }

const PLATFORM_FOR = (m: VideoMoment, i: number): string =>
  m.brand === 'RhettStar' ? (i % 2 ? 'facebook' : 'instagram') : (i % 2 ? 'tiktok' : 'instagram')

/** Ask the Content Factory brain for an SEO caption + hashtags for one clip. */
async function writeCaption(m: VideoMoment, businessName: string, goal = ''): Promise<{ caption: string; hashtags: string[] }> {
  const key = process.env.OPENAI_API_KEY
  const fallback = { caption: m.whatHappens, hashtags: ['#BigStarCircus', '#GoldCoast', '#circuskids'] }
  if (!key) return fallback
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_tokens: 500,
        messages: [
          { role: 'system', content: `You write social captions for ${businessName}, a kids circus school on the Gold Coast, Australia. Warm, real, Australian English, family-first. Never say "amazing" or "magical". SEO: lead with searchable words a parent would type (the skill, "kids circus Gold Coast"). Never name a child or their school. Return ONLY JSON {"caption":"60-100 words","hashtags":["#tag"]}` },
          { role: 'user', content: `${goal ? `THE GOAL of this content: ${goal}\nMake the caption serve that goal.\n\n` : ''}Clip (${m.brand}): ${m.whatHappens}\nOn-screen hook: ${m.hook}\nCall to action: ${m.cta}\n\nWrite the caption + 5-8 hashtags (mix reach + local).` },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    })
    if (!r.ok) return fallback
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const parsed = JSON.parse(j.choices?.[0]?.message?.content?.trim() || '{}') as { caption?: string; hashtags?: unknown }
    return {
      caption: String(parsed.caption || m.whatHappens).trim(),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 8) : fallback.hashtags,
    }
  } catch { return fallback }
}

export async function POST(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  // Accept one path or many (a whole filming day), however Windows hands them
  // over: "quoted", with &-escapes from PowerShell's Copy as path, etc.
  const clean = (p: unknown) => String(p ?? '').trim().replace(/^["']|["']$/g, '').replace(/^&\s*/, '').trim()
  const videoPaths = (Array.isArray(body.videoPath) ? body.videoPath : [body.videoPath])
    .map(clean)
    .filter(Boolean)

  if (!videoPaths.length) return NextResponse.json({ error: 'Pick at least one video.' }, { status: 400 })
  if (videoPaths.length > 8) return NextResponse.json({ error: 'That’s a lot at once — pick up to 8 videos per run.' }, { status: 400 })

  for (const p of videoPaths) {
    if (!existsSync(p)) {
      return NextResponse.json({
        error: `I can’t find this video: ${p.split(/[\\/]/).pop()}. Tip: right-click the file → "Copy as path", then paste it in.`,
      }, { status: 400 })
    }
    if (!/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(p)) {
      return NextResponse.json({ error: `"${p.split(/[\\/]/).pop()}" isn’t a video file — it needs to be an .mp4 or .mov.` }, { status: 400 })
    }
  }

  const maxClips = Math.min(6, Math.max(1, Number(body.maxClips ?? 4)))
  const businessName = user.tenant?.name || 'BigStar Circus'

  // Audio: original class sound, music only, or both mixed. (Legacy withMusic
  // still honoured so older calls don't break.)
  const audioMode: AudioMode = (['original', 'music', 'both'] as const).includes(body.audioMode as AudioMode)
    ? (body.audioMode as AudioMode)
    : (body.withMusic === false ? 'original' : 'music')

  const musicVibe = String(body.musicVibe ?? '').trim().slice(0, 200)
  const goal = String(body.goal ?? '').trim().slice(0, 800)
  const forcedCta = String(body.forcedCta ?? '').trim().slice(0, 120)
  const lengthHint = (['short', 'medium', 'long'] as const).includes(body.clipLength as 'short')
    ? (body.clipLength as 'short' | 'medium' | 'long')
    : 'medium'

  // Turn a technical failure into something Rhett can act on.
  const friendlyError = (raw: string) =>
    /not connected/i.test(raw) ? 'The AI video-watcher isn’t connected on the server yet.'
    : /quota|rate|RESOURCE_EXHAUSTED|429/i.test(raw) ? 'Google’s free AI limit has been hit for now — try again in a few minutes.'
    : /API key|API_KEY_INVALID|permission|401|403/i.test(raw) ? 'Google rejected the AI key — it may need regenerating.'
    : /process that video|state:/i.test(raw) ? 'Google couldn’t read that video file. Try a standard .mp4.'
    : /no usable moments/i.test(raw) ? 'The AI watched it but couldn’t find a strong moment — try one with more action.'
    : `The AI couldn’t watch that video. ${raw}`.trim()

  const built: Built[] = []
  const failures: string[] = []
  let clipIndex = 0

  // Process each video in turn: Gemini watches it, then we render its moments.
  for (const path of videoPaths) {
    const shortName = path.split(/[\\/]/).pop() || path
    let moments: VideoMoment[]
    try {
      moments = (await findMoments(path, businessName, { goal, forcedCta, lengthHint })).slice(0, maxClips)
      if (forcedCta) moments = moments.map((m) => ({ ...m, cta: forcedCta }))
    } catch (e) {
      failures.push(`${shortName}: ${friendlyError(e instanceof Error ? e.message : '')}`)
      continue
    }

    for (const m of moments) {
      const i = clipIndex++
      try {
        const [clip, copy] = await Promise.all([
          buildClip({ sourcePath: path, moment: m, index: i, audioMode, musicVibe }),
          writeCaption(m, businessName, goal),
        ])
        const caption = [
          m.hook,
          copy.caption,
          copy.hashtags.join(' '),
          `— — —\nBrand: ${m.brand}  ·  ⭐ ${m.viralScore}/10  ·  📣 ${m.cta}\n🎬 ${m.whatHappens}${videoPaths.length > 1 ? `\n📁 From: ${shortName}` : ''}`,
        ].filter(Boolean).join('\n\n')
        built.push({ ...m, publicPath: clip.publicPath, caption, platform: PLATFORM_FOR(m, i), sourcePath: path })
      } catch (e) {
        failures.push(`${m.hook || shortName}: ${e instanceof Error ? e.message : 'render failed'}`)
      }
    }
  }

  if (!built.length) {
    return NextResponse.json({ error: failures[0] || 'Could not build any clips.' }, { status: 502 })
  }

  // 3. Hand them back for REVIEW — nothing is saved until Rhett ticks the ones
  // he wants (see /api/social/bigstar-tv/save).
  return NextResponse.json({
    ok: true,
    created: built.length,
    clips: built.map((b) => ({
      publicPath: b.publicPath, hook: b.hook, cta: b.cta, viralScore: b.viralScore,
      brand: b.brand, platform: b.platform, whatHappens: b.whatHappens, caption: b.caption,
      // Kept so a clip can be re-edited without re-watching the whole video.
      sourcePath: b.sourcePath, start: b.start, end: b.end,
    })),
    ...(failures.length ? { warnings: failures } : {}),
  })
}
