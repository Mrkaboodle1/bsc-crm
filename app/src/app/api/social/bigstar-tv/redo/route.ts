// /api/social/bigstar-tv/redo — re-make ONE clip.
// "I like this moment but do it differently" — change the music, the sound
// mode, trim it, or give feedback and let the AI rewrite the hook/CTA.
// Re-cuts straight from the same moment, so it's fast (no re-watching).
//
// POST { sourcePath, start, end, hook, cta, brand, whatHappens,
//        feedback?, musicVibe?, audioMode?, goal? }
// Returns { ok, clip: { publicPath, hook, cta, caption, ... } }

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'node:fs'
import { verifySession, type BscUser } from '@/lib/dal'
import { buildClip, type AudioMode } from '@/lib/clip-builder'
import type { VideoMoment } from '@/lib/gemini-video'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Rewrite the hook/CTA/caption from Rhett's feedback. */
async function rewrite(m: VideoMoment, feedback: string, businessName: string, goal: string) {
  const key = process.env.OPENAI_API_KEY
  const fallback = { hook: m.hook, cta: m.cta, caption: m.whatHappens, hashtags: ['#BigStarCircus', '#GoldCoast', '#circuskids'] }
  if (!key || !feedback) return fallback
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 500,
        messages: [
          { role: 'system', content: `You write social content for ${businessName}, a kids circus school on the Gold Coast, Australia. Warm, real, Australian English. Never say "amazing" or "magical". Never name a child or their school. SEO: lead with searchable words a parent would type. Return ONLY JSON {"hook":"under 8 words","cta":"short call to action","caption":"60-100 words","hashtags":["#tag"]}` },
          { role: 'user', content: `${goal ? `GOAL of this content: ${goal}\n\n` : ''}This clip shows: ${m.whatHappens}\nCurrent hook: "${m.hook}"\nCurrent CTA: "${m.cta}"\n\nRHETT'S FEEDBACK — do it this way instead:\n"""${feedback}"""\n\nRewrite the hook, CTA and caption following his feedback.` },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    })
    if (!r.ok) return fallback
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const p = JSON.parse(j.choices?.[0]?.message?.content?.trim() || '{}') as Record<string, unknown>
    return {
      hook: String(p.hook || m.hook).trim(),
      cta: String(p.cta || m.cta).trim(),
      caption: String(p.caption || m.whatHappens).trim(),
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map(String).slice(0, 8) : fallback.hashtags,
    }
  } catch { return fallback }
}

export async function POST(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const sourcePath = String(body.sourcePath ?? '').trim()
  if (!sourcePath || !existsSync(sourcePath)) {
    return NextResponse.json({ error: 'The original video has moved — re-run the engine on it.' }, { status: 400 })
  }

  const businessName = user.tenant?.name || 'BigStar Circus'
  const feedback = String(body.feedback ?? '').trim().slice(0, 600)
  const goal = String(body.goal ?? '').trim().slice(0, 800)
  const musicVibe = String(body.musicVibe ?? '').trim().slice(0, 200)
  const audioMode: AudioMode = (['original', 'music', 'both'] as const).includes(body.audioMode as AudioMode)
    ? (body.audioMode as AudioMode) : 'music'

  const base: VideoMoment = {
    start: Number(body.start) || 0,
    end: Number(body.end) || (Number(body.start) || 0) + 15,
    whatHappens: String(body.whatHappens ?? '').trim(),
    viralScore: Number(body.viralScore) || 0,
    brand: body.brand === 'RhettStar' ? 'RhettStar' : 'BSC TV',
    hook: String(body.hook ?? '').trim(),
    cta: String(body.cta ?? '').trim(),
    hasSpeech: Boolean(body.hasSpeech),
  }

  const copy = await rewrite(base, feedback, businessName, goal)
  const moment: VideoMoment = { ...base, hook: copy.hook, cta: copy.cta }

  try {
    // A fresh index each time so a different music track can be picked.
    const clip = await buildClip({
      sourcePath, moment,
      index: Math.floor(Math.random() * 1000),
      audioMode, musicVibe,
    })
    const caption = [
      moment.hook,
      copy.caption,
      copy.hashtags.join(' '),
      `— — —\nBrand: ${moment.brand}  ·  ⭐ ${moment.viralScore}/10  ·  📣 ${moment.cta}\n🎬 ${moment.whatHappens}`,
    ].filter(Boolean).join('\n\n')

    return NextResponse.json({
      ok: true,
      clip: {
        publicPath: clip.publicPath, hook: moment.hook, cta: moment.cta,
        viralScore: moment.viralScore, brand: moment.brand,
        whatHappens: moment.whatHappens, caption,
        sourcePath, start: moment.start, end: moment.end,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not re-make that clip' }, { status: 502 })
  }
}
