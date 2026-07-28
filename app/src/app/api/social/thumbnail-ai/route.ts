// /api/social/thumbnail-ai — generate a thumbnail with OpenAI (gpt-image-1),
// using the CRM's connected OPENAI_API_KEY, and store it in Supabase 'media'
// storage so it's a clean, permanent URL. Costs a few cents per image.
//
// POST { prompt: string } -> { url: string }

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type BscUser } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'OpenAI is not configured on the server.' }, { status: 503 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const prompt = String(body.prompt ?? '').trim()
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

  let b64: string
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium', n: 1 }),
      signal: AbortSignal.timeout(55_000),
    })
    const json = await r.json().catch(() => ({})) as { data?: Array<{ b64_json?: string }>; error?: { message?: string } }
    if (!r.ok) return NextResponse.json({ error: (json.error?.message || `OpenAI returned ${r.status}`).slice(0, 220) }, { status: 502 })
    const img = json.data?.[0]?.b64_json
    if (!img) return NextResponse.json({ error: 'OpenAI returned no image' }, { status: 502 })
    b64 = img
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Image generation failed' }, { status: 502 })
  }

  // Store the PNG in Supabase 'media' storage → clean permanent URL.
  try {
    const supabase = await createServerSupabase()
    const bytes = Buffer.from(b64, 'base64')
    const path = `thumbnails/${Date.now()}-${Math.round(Math.random() * 1e9)}.png`
    const { error: upErr } = await supabase.storage.from('media').upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (upErr) {
      // Fall back to a data URL if storage isn't available.
      return NextResponse.json({ url: `data:image/png;base64,${b64}` })
    }
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
    return NextResponse.json({ url: pub.publicUrl })
  } catch {
    return NextResponse.json({ url: `data:image/png;base64,${b64}` })
  }
}
