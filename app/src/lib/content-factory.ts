// Content Factory — shared "brain".
// Turns a filming-session brief (typed by Rhett OR built from Vizard clips)
// into N platform-tailored post drafts, written to posted_media as drafts.
// Used by /api/social/factory (typed brief) and /api/social/vizard/clips
// (auto-built brief from Vizard's clip transcripts).

import 'server-only'
import { createServerSupabase } from '@/lib/supabase-server'

// posted_media.platform CHECK allows these (NOT youtube/linkedin yet — see
// CONTRACT-STAN-JACKY.md OPEN ITEMS for the enum expansion request).
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'threads'
export type Brand = 'BSC TV' | 'RhettStar'

export type GeneratedPost = {
  brand: Brand
  platform: Platform
  hook: string
  caption: string
  hashtags: string[]
  firstComment: string
  clipIdea: string
  videoUrl?: string   // the Vizard clip video (when generated from clips)
  editorUrl?: string  // link back to edit this clip in Vizard
  viralScore?: string | number  // Vizard's virality score 0–10
  viralReason?: string          // why Vizard thinks the clip is engaging
}

export const ALLOWED_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'threads']
export const ALLOWED_BRANDS: Brand[] = ['BSC TV', 'RhettStar']

export function clampCount(raw: unknown): number {
  const n = Number(raw ?? 10)
  if (!Number.isFinite(n)) return 10
  return Math.min(15, Math.max(1, Math.round(n)))
}

export function parseBrands(raw: unknown): Brand[] {
  if (!Array.isArray(raw)) return [...ALLOWED_BRANDS]
  const picked = raw.filter((b): b is Brand => ALLOWED_BRANDS.includes(b as Brand))
  return picked.length ? picked : [...ALLOWED_BRANDS]
}

function systemPrompt(businessName: string): string {
  return `You are the Media Director for ${businessName} (BSC TV) and RhettStar — a real Gold Coast circus school turning footage into social content.

You turn ONE filming session into a batch of short-form social posts across two brands.

BSC TV DNA: positive, family-friendly, inspirational, educational, funny, safe, high-energy, achievement-based, community-focused. A child's FIRST trick beats an advanced one — emotion over difficulty. Parents share emotional moments; kids share funny ones; sponsors want community impact.

RhettStar DNA: honest, energetic, ambitious, funny, raw, behind-the-scenes, founder-led, story-driven. People follow the JOURNEY of building a circus media company from the Gold Coast — what's being built, why, what broke, what was learned, the next big goal.

HOOK FAMILIES — BSC TV: Transformation ("She was scared last week…"), Achievement ("He finally landed it."), Curiosity ("Watch what happened…"), Parent-proof ("Parents couldn't believe this…"), Challenge ("Can your child do this?"), Belief ("This is why circus builds confidence.").
HOOK FAMILIES — RhettStar: Vulnerability ("I nearly gave up today…"), Reality ("Nobody sees this part."), Ambition ("I want to perform for 100,000 people."), Failure ("Today went completely wrong."), Pivot ("This one decision changed everything."), Build-in-public.

CHILD SAFETY (non-negotiable): never use a child's surname, school name, or any location that identifies where kids are. First names only, and only if natural. Never imply a specific child without consent — keep it general ("one of our students") when in doubt.

VOICE: warm, Australian English, real and specific, never sappy or overhyped. Never use the words "amazing" or "magical".

SEO (important): make every hook/title AND caption search-friendly. Lead with concrete, searchable keywords a parent would actually type ("kids circus class Gold Coast", "aerial silks for beginners", the specific trick/skill), use natural keyword-rich phrasing, and work in the location (Gold Coast / Australia) where it fits. Hashtags mix high-reach + local discovery (e.g. #GoldCoast #circuskids #aerialsilks).

PLATFORM STYLE:
- instagram: hook in line 1, 60–100 word caption, 5–8 hashtags.
- tiktok: punchy, 25–50 word caption, 3–5 hashtags.
- facebook: friendly, 80–120 words, 3–4 hashtags.
- threads: conversational, short, 1–3 hashtags.

Return ONLY valid JSON, no markdown, in this exact shape:
{"posts":[{"brand":"BSC TV"|"RhettStar","platform":"instagram"|"tiktok"|"facebook"|"threads","hook":"on-screen opening line, <8 words","caption":"the full post caption","hashtags":["#tag", "..."],"firstComment":"a question to seed engagement","clipIdea":"which moment from the brief this uses"}]}`
}

function userPrompt(brief: string, brands: Brand[], count: number): string {
  return `Filming session brief:
"""
${brief}
"""

Generate exactly ${count} posts total, spread across these brands: ${brands.join(' and ')}.
Spread them across instagram, tiktok, facebook and threads (don't put everything on one platform).
Where a moment works for both brands, write a different angle for each.
Return the JSON now.`
}

function coercePosts(raw: unknown): GeneratedPost[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: GeneratedPost[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    const platform = ALLOWED_PLATFORMS.includes(p.platform as Platform) ? (p.platform as Platform) : 'instagram'
    const brand = ALLOWED_BRANDS.includes(p.brand as Brand) ? (p.brand as Brand) : 'BSC TV'
    const caption = String(p.caption ?? '').trim()
    if (!caption) continue
    out.push({
      brand,
      platform,
      hook: String(p.hook ?? '').trim(),
      caption,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((h) => String(h).trim()).filter(Boolean).slice(0, 10) : [],
      firstComment: String(p.firstComment ?? '').trim(),
      clipIdea: String(p.clipIdea ?? '').trim(),
    })
  }
  return out
}

// Compose the draft caption stored in posted_media. Everything Rhett needs to
// review is in one field (posted_media has no metadata column yet — schema
// request logged in CONTRACT-STAN-JACKY.md). He trims the footer before posting.
function composeCaption(p: GeneratedPost): string {
  const body = [p.hook, p.caption].filter(Boolean).join('\n\n')
  const tags = p.hashtags.length ? `\n\n${p.hashtags.join(' ')}` : ''
  const footerBits = [`Brand: ${p.brand}`]
  if (p.viralScore != null && p.viralScore !== '') footerBits.push(`⭐ Virality ${p.viralScore}/10`)
  if (p.firstComment) footerBits.push(`💬 First comment: ${p.firstComment}`)
  if (p.clipIdea) footerBits.push(`🎬 Clip: ${p.clipIdea}`)
  const footer = `\n\n— — —\n${footerBits.join('  ·  ')}`
  const editLink = p.editorUrl ? `\n🔗 Edit in Vizard: ${p.editorUrl}` : ''
  return `${body}${tags}${footer}${editLink}`.trim()
}

// Also draft ONE warm subscriber email per filming session (platform='email').
// Bonus output — failures are swallowed so they never break post generation.
function emailSystem(businessName: string): string {
  return `You write warm, short subscriber emails for ${businessName}, a Gold Coast kids circus school. Voice: warm, family-first, Australian English, real, never salesy. End with a soft call to action (book a trial class / come and watch). Return ONLY JSON {"subject":"...","body":"..."} — body is 90–160 words, plain text with line breaks.`
}
async function makeEmailDraft(opts: { context: string; tenantId: string; userId: string; businessName: string }): Promise<void> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', response_format: { type: 'json_object' }, temperature: 0.8, max_tokens: 700,
        messages: [
          { role: 'system', content: emailSystem(opts.businessName) },
          { role: 'user', content: `Write one subscriber email from this filming session.\n\n${opts.context.slice(0, 3000)}` },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!r.ok) return
    const json = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content?.trim() ?? ''
    let parsed: { subject?: string; body?: string }
    try { parsed = JSON.parse(content) } catch { return }
    const subject = String(parsed.subject ?? '').trim()
    const emailBody = String(parsed.body ?? '').trim()
    if (!emailBody) return
    const supabase = await createServerSupabase()
    await supabase.from('posted_media').insert({
      tenant_id: opts.tenantId,
      caption: `Subject: ${subject}\n\n${emailBody}\n\n— — —\n📧 Email newsletter draft`,
      media_url: null,
      media_kind: 'upload',
      platform: 'email',
      status: 'draft',
      posted_by_user_id: opts.userId,
    })
  } catch { /* email is a bonus — never break the main flow */ }
}

export type FactoryResult =
  | { ok: true; created: number; posts: GeneratedPost[] }
  | { ok: false; error: string; status: number }

// The core: generate posts from a brief with OpenAI, insert as drafts.
export async function generateDrafts(opts: {
  brief: string
  brands: Brand[]
  count: number
  mediaUrl: string | null
  tenantId: string
  userId: string
  businessName: string
}): Promise<FactoryResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, error: 'AI is not configured on the server.', status: 503 }

  let posts: GeneratedPost[]
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt(opts.businessName) },
          { role: 'user', content: userPrompt(opts.brief, opts.brands, opts.count) },
        ],
        temperature: 0.85,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(55_000),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      return { ok: false, error: `AI returned ${r.status}: ${detail.slice(0, 160)}`, status: 502 }
    }
    const json = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!content) return { ok: false, error: 'Empty response from AI', status: 502 }
    let parsed: unknown
    try { parsed = JSON.parse(content) } catch { return { ok: false, error: 'AI returned malformed JSON', status: 502 } }
    posts = coercePosts((parsed as { posts?: unknown })?.posts)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI request failed', status: 502 }
  }

  if (!posts.length) return { ok: false, error: 'No usable posts were generated — try a richer brief.', status: 502 }

  const rows = posts.map((p) => ({
    tenant_id: opts.tenantId,
    caption: composeCaption(p),
    media_url: opts.mediaUrl,
    media_kind: opts.mediaUrl ? 'ai_generated' : 'upload',
    platform: p.platform,
    status: 'draft' as const,
    posted_by_user_id: opts.userId,
  }))

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('posted_media').insert(rows)
  if (error) return { ok: false, error: error.message, status: 400 }

  await makeEmailDraft({ context: opts.brief, tenantId: opts.tenantId, userId: opts.userId, businessName: opts.businessName })
  return { ok: true, created: rows.length, posts }
}

export type VizardClipInput = {
  videoUrl?: string | null
  clipEditorUrl?: string | null
  title?: string | null
  transcript?: string | null
  viralScore?: string | number | null
  viralReason?: string | null
}

// Generate ONE post per Vizard clip, with the clip's video + Vizard editor link
// attached to each draft — so each post shows its playable clip and a link back
// to Vizard to fix music/video/timing.
export async function generateDraftsFromClips(opts: {
  clips: VizardClipInput[]
  brands: Brand[]
  tenantId: string
  userId: string
  businessName: string
}): Promise<FactoryResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, error: 'AI is not configured on the server.', status: 503 }
  const clips = opts.clips.slice(0, 10)
  if (!clips.length) return { ok: false, error: 'No clips to write from.', status: 400 }

  const clipList = clips.map((c, i) => {
    const title = (c.title || '').toString().trim()
    const transcript = (c.transcript || '').toString().replace(/\s+/g, ' ').trim().slice(0, 600)
    return `CLIP ${i}: ${title}\n${transcript}`
  }).join('\n\n')

  const userMsg = `Here are the short clips Vizard cut from one BigStar filming session. Write ONE social post per clip — pick the single best brand + platform for each clip.

${clipList}

Return exactly one post per clip, each tagged with its clip number. Brands available: ${opts.brands.join(' and ')}.
Return ONLY JSON: {"posts":[{"clipIndex":0,"brand":"BSC TV"|"RhettStar","platform":"instagram"|"tiktok"|"facebook"|"threads","hook":"SEO, searchable, <8 words","caption":"SEO-rich caption","hashtags":["#.."],"firstComment":"a question to seed engagement"}]}`

  let parsed: Array<Record<string, unknown>>
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt(opts.businessName) },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.85,
        max_tokens: 3500,
      }),
      signal: AbortSignal.timeout(55_000),
    })
    if (!r.ok) { const d = await r.text().catch(() => ''); return { ok: false, error: `AI returned ${r.status}: ${d.slice(0, 160)}`, status: 502 } }
    const json = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!content) return { ok: false, error: 'Empty response from AI', status: 502 }
    let obj: unknown
    try { obj = JSON.parse(content) } catch { return { ok: false, error: 'AI returned malformed JSON', status: 502 } }
    const arr = (obj as { posts?: unknown }).posts
    parsed = Array.isArray(arr) ? arr as Array<Record<string, unknown>> : []
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI request failed', status: 502 }
  }

  const posts: GeneratedPost[] = []
  for (const p of parsed) {
    const caption = String(p.caption ?? '').trim()
    if (!caption) continue
    const idx = Number(p.clipIndex ?? -1)
    const clip = idx >= 0 && idx < clips.length ? clips[idx] : undefined
    const platform = ALLOWED_PLATFORMS.includes(p.platform as Platform) ? (p.platform as Platform) : 'instagram'
    const brand = ALLOWED_BRANDS.includes(p.brand as Brand) ? (p.brand as Brand) : 'BSC TV'
    posts.push({
      brand, platform,
      hook: String(p.hook ?? '').trim(),
      caption,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((h) => String(h).trim()).filter(Boolean).slice(0, 10) : [],
      firstComment: String(p.firstComment ?? '').trim(),
      clipIdea: clip?.title ? String(clip.title) : '',
      videoUrl: clip?.videoUrl ? String(clip.videoUrl) : undefined,
      editorUrl: clip?.clipEditorUrl ? String(clip.clipEditorUrl) : undefined,
      viralScore: clip?.viralScore != null ? clip.viralScore : undefined,
      viralReason: clip?.viralReason ? String(clip.viralReason) : undefined,
    })
  }
  if (!posts.length) return { ok: false, error: 'No usable posts were generated from the clips.', status: 502 }

  const rows = posts.map((p) => ({
    tenant_id: opts.tenantId,
    caption: composeCaption(p),
    media_url: p.videoUrl ?? null,
    media_kind: 'upload' as const,
    platform: p.platform,
    status: 'draft' as const,
    posted_by_user_id: opts.userId,
  }))
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('posted_media').insert(rows)
  if (error) return { ok: false, error: error.message, status: 400 }
  await makeEmailDraft({ context: clipList, tenantId: opts.tenantId, userId: opts.userId, businessName: opts.businessName })
  return { ok: true, created: rows.length, posts }
}
