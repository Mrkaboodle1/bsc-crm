// /api/ai-text — single OpenAI endpoint that powers every "✨ AI" button
// across the CRM (page builder hero text, social posts, email drafts, etc).
//
// POST { task: 'rewrite' | 'extend' | 'social' | 'email' | 'hero' | 'free',
//        prompt: string,
//        context?: string,
//        tone?: 'professional' | 'friendly' | 'playful' | 'urgent',
//        maxWords?: number,
//        platform?: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'email' }
//
// Returns { text: string } or { variants: string[] } depending on task.

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'

export const runtime = 'nodejs'
export const maxDuration = 60

type Task = 'rewrite' | 'extend' | 'shorten' | 'social' | 'email' | 'hero' | 'free' | 'bullets'
type Tone = 'professional' | 'friendly' | 'playful' | 'urgent'
type Platform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'email'

const SYSTEM = `You write for Big Star Circus — a kids circus school on the Gold Coast (Molendinar, QLD).
Voice: warm, confident, jargon-free, slightly cheeky. Real circus, real performers,
real kids. Never sappy or overhyped. Never use "amazing" or "magical".
Output ONLY the requested text. No preamble, no labels, no markdown, no quotes around the answer.`

function taskPrompt(task: Task, opts: {
  prompt: string
  context?: string
  tone?: Tone
  maxWords?: number
  platform?: Platform
  variants?: number
}): string {
  const { prompt, context, tone = 'friendly', maxWords, platform, variants = 1 } = opts
  const toneLine = `Tone: ${tone}.`
  const maxLine = maxWords ? `Maximum ${maxWords} words.` : ''
  const ctxLine = context ? `Context to draw from:\n${context}\n` : ''

  switch (task) {
    case 'rewrite':
      return `Rewrite the following text. ${toneLine} ${maxLine}\n\nText to rewrite:\n${prompt}`

    case 'extend':
      return `Extend / continue the following text by one to two paragraphs. ${toneLine} ${maxLine}\n\n${prompt}`

    case 'shorten':
      return `Shorten the following text. Keep the key message. ${toneLine} ${maxLine || 'Aim for half the length.'}\n\n${prompt}`

    case 'bullets':
      return `Convert the following into 3–5 concise bullet points (no leading dashes — one bullet per line). ${toneLine}\n\n${prompt}`

    case 'hero':
      return `Write a high-converting hero section for Big Star Circus.
${toneLine}
Topic / context: ${prompt}
${ctxLine}
Return exactly three lines:
Line 1: a 4–8 word headline
Line 2: a 6–14 word subheadline
Line 3: a 2–4 word call-to-action button label
No labels, just the three lines.`

    case 'social': {
      const platformGuide: Record<Platform, string> = {
        facebook:  'Facebook post. 80–120 words. Friendly, scroll-stopping first sentence. 3–4 relevant hashtags at the end.',
        instagram: 'Instagram caption. 60–100 words. Hook in the first line. 5–10 hashtags grouped at the end.',
        linkedin:  'LinkedIn post. 100–150 words. Professional but warm. Storytelling. No hashtags unless explicitly relevant.',
        twitter:   'Tweet thread. First tweet is the hook. Up to 4 tweets, 280 chars each, separated by a blank line.',
        tiktok:    'TikTok caption. 25–50 words. Punchy hook. 3–5 hashtags.',
        email:     'Email body. 80–150 words. Personal tone.',
      }
      const guide = platform ? platformGuide[platform] : platformGuide.facebook
      const varLine = variants > 1 ? `Return ${variants} DIFFERENT versions, separated by exactly the line "---" on its own line.` : ''
      return `Write a social post.
${guide}
${toneLine}
Topic: ${prompt}
${ctxLine}
${varLine}`
    }

    case 'email': {
      const varLine = variants > 1 ? `Return ${variants} DIFFERENT versions, separated by exactly the line "---" on its own line.` : ''
      return `Write a marketing email body (no subject line — just the body).
${toneLine} ${maxLine || 'Aim for 80–150 words.'}
Topic: ${prompt}
${ctxLine}
${varLine}`
    }

    case 'free':
    default:
      return `${toneLine} ${maxLine}\n\n${prompt}`
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifySession()
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'OpenAI not configured on the server.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const task = (body.task ?? 'free') as Task
  const prompt = String(body.prompt ?? '').trim()
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  if (prompt.length > 4000) return NextResponse.json({ error: 'Prompt too long (max 4000 chars)' }, { status: 400 })

  const variants = Math.min(5, Math.max(1, Number(body.variants ?? 1)))
  const userPrompt = taskPrompt(task, {
    prompt,
    context: body.context ? String(body.context).slice(0, 4000) : undefined,
    tone: body.tone as Tone | undefined,
    maxWords: body.maxWords ? Number(body.maxWords) : undefined,
    platform: body.platform as Platform | undefined,
    variants,
  })

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return NextResponse.json({ error: `OpenAI returned ${r.status}`, detail: text.slice(0, 200) }, { status: 502 })
    }
    const json = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 502 })

    if (variants > 1) {
      const parts = text.split(/\n---+\n/).map((p) => p.trim()).filter(Boolean)
      return NextResponse.json({ variants: parts, text })
    }
    return NextResponse.json({ text })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI request failed' }, { status: 502 })
  }
}
