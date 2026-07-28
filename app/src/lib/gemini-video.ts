// gemini-video.ts — the EYES of the Big Star TV engine.
// Sends a video to Google Gemini, which WATCHES it (frames + audio) and returns
// the best moments with timestamps, a virality score, a hook and a CTA.
//
// This is what speech-based tools (Whisper/clipify) cannot do: BigStar's class
// footage is mostly action with almost no talking. Proven 25 Jul 2026 on the raw
// aerial video — see bigstar-media/GEMINI-BREAKTHROUGH-PROVEN.md.

import 'server-only'
import { readFile } from 'node:fs/promises'

const BASE = 'https://generativelanguage.googleapis.com'
// NOTE: 'gemini-2.5-flash' is retired for new keys (404). Use the latest alias.
const MODEL = 'gemini-flash-latest'

export type VideoMoment = {
  start: number
  end: number
  whatHappens: string
  viralScore: number
  brand: 'BSC TV' | 'RhettStar'
  hook: string
  cta: string
  hasSpeech: boolean
}

export type MomentOptions = {
  goal?: string        // what this batch is FOR (e.g. "Play On voucher campaign")
  forcedCta?: string   // use this exact call to action on every clip
  lengthHint?: 'short' | 'medium' | 'long'
}

function prompt(businessName: string, o: MomentOptions = {}): string {
  const lengths = { short: '8–15 seconds (punchy, for TikTok)', medium: '12–25 seconds', long: '20–40 seconds (for Facebook/YouTube)' }
  const goalBlock = o.goal
    ? `\n\n🎯 THE GOAL OF THIS BATCH — this matters more than anything else:\n"""${o.goal}"""\nChoose moments that serve this goal, and make every hook and CTA push towards it.`
    : ''
  const ctaBlock = o.forcedCta ? `\n\nUSE THIS EXACT CALL TO ACTION on every clip: "${o.forcedCta}"` : ''
  const lenBlock = `\n\nClip length: aim for ${lengths[o.lengthHint ?? 'medium']}.`

  return `You are a social media producer for ${businessName}, a kids circus school on the Gold Coast, Australia.${goalBlock}${ctaBlock}${lenBlock}

WATCH this video and find the best moments to turn into short vertical social clips. Judge on what you SEE — the action, the skill, the emotion, kids' faces, funny mishaps. There is often very little speech, so do NOT rely on the audio to find moments.

What makes a great BigStar moment:
- A child's FIRST success or a breakthrough beats a technically harder trick — emotion over difficulty.
- Parents share pride and emotion. Kids share funny. Sponsors love community and inclusion.
- Look for: landing a trick, a proud/joyful face, teamwork, a funny fail, high energy, Rhett coaching or performing.

For EACH moment return:
- start/end in SECONDS (aim for 8–25 second clips, tight around the action)
- whatHappens: what you actually see
- viralScore 0–10
- brand: "BSC TV" (student/class/community moment) or "RhettStar" (Rhett coaching, speaking, behind-the-scenes, founder journey)
- hook: a scroll-stopping on-screen opening line, UNDER 8 WORDS (e.g. "What if your kid could fly?")
- cta: a short call to action (e.g. "Book a free trial class")
- hasSpeech: true only if someone is clearly speaking during this moment

CHILD SAFETY: never use a child's surname, school, or any location. Describe kids generally ("a young student"), never identify them.
VOICE: warm, real, Australian English. Never use the words "amazing" or "magical".

Return ONLY JSON:
{"moments":[{"start":0,"end":0,"whatHappens":"","viralScore":0,"brand":"BSC TV","hook":"","cta":"","hasSpeech":false}]}`
}

/** Upload a local video file to Gemini's File API and wait until it's ready. */
async function uploadVideo(key: string, filePath: string): Promise<string> {
  const bytes = await readFile(filePath)

  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'bigstar-footage' } }),
  })
  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error(`Gemini upload could not start (${start.status})`)

  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(bytes),
  })
  const info = await up.json() as { file?: { name?: string; uri?: string; state?: string } }
  let file = info.file
  if (!file?.name || !file.uri) throw new Error('Gemini did not accept the video upload')

  // Google needs a moment to process the video before it can be watched.
  for (let i = 0; i < 60 && file.state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const st = await fetch(`${BASE}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': key } })
    file = await st.json() as { name?: string; uri?: string; state?: string }
  }
  if (file.state !== 'ACTIVE') throw new Error(`Gemini could not process that video (state: ${file.state})`)
  return file.uri!
}

function coerceMoments(raw: unknown): VideoMoment[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: VideoMoment[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const start = Number(m.start)
    const end = Number(m.end)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
    out.push({
      start: Math.max(0, start),
      end,
      whatHappens: String(m.whatHappens ?? '').trim(),
      viralScore: Number(m.viralScore) || 0,
      brand: m.brand === 'RhettStar' ? 'RhettStar' : 'BSC TV',
      hook: String(m.hook ?? '').trim(),
      cta: String(m.cta ?? '').trim(),
      hasSpeech: Boolean(m.hasSpeech),
    })
  }
  return out.sort((a, b) => b.viralScore - a.viralScore)
}

/** Watch a local video file and return its best moments, ranked. */
export async function findMoments(filePath: string, businessName = 'BigStar Circus', options: MomentOptions = {}): Promise<VideoMoment[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Gemini is not connected on the server.')

  const uri = await uploadVideo(key, filePath)

  const r = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [
        { file_data: { mime_type: 'video/mp4', file_uri: uri } },
        { text: prompt(businessName, options) },
      ] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  })
  const j = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } }
  if (!r.ok) throw new Error(j.error?.message || `Gemini returned ${r.status}`)

  const text = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  if (!text) throw new Error('Gemini returned nothing')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('Gemini returned malformed JSON') }

  const moments = coerceMoments((parsed as { moments?: unknown })?.moments)
  if (!moments.length) throw new Error('Gemini found no usable moments in that video')
  return moments
}
