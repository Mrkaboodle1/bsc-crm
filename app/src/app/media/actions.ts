'use server'

// Media library server actions.
//
// uploadMedia    — accepts a File via FormData, writes to Supabase Storage
//                  bucket `media`, then inserts a row in `media_assets`.
// generateMedia  — calls /api/ai-image (Pollinations.ai), saves the bytes
//                  to storage, and inserts a row with source='ai' + the prompt.
// listMedia      — paginated list, optional source filter + search.
// deleteMedia    — removes the row AND the storage object.

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export type MediaItem = {
  id: string
  url: string
  filename: string | null
  mime_type: string | null
  width: number | null
  height: number | null
  source: 'upload' | 'ai' | 'external'
  prompt: string | null
  alt_text: string | null
  tags: string[]
  created_at: string
}

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }

function tableMissing(msg: string | undefined): boolean {
  if (!msg) return false
  return msg.includes('does not exist') || msg.includes('relation')
}

// ────────────────────────────────────────────────────────────────────
// AI image providers
// ────────────────────────────────────────────────────────────────────

const UA = 'BSC-CRM/0.1 (+https://bigstarcircus.com.au)'

async function generateWithPollinations(opts: { prompt: string; width: number; height: number }) {
  // Pollinations occasionally 502s or times out under load. We try the
  // primary "flux" model with two random seeds, then fall back to the
  // faster "turbo" model. ~80% of failures recover by the second try.
  const attempts: Array<{ model: string; seed: number; timeoutMs: number }> = [
    { model: 'flux',  seed: Math.floor(Math.random() * 1_000_000), timeoutMs: 60_000 },
    { model: 'flux',  seed: Math.floor(Math.random() * 1_000_000), timeoutMs: 45_000 },
    { model: 'turbo', seed: Math.floor(Math.random() * 1_000_000), timeoutMs: 30_000 },
  ]
  let lastErr = 'AI generation failed'
  for (const a of attempts) {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(opts.prompt)}?width=${opts.width}&height=${opts.height}&seed=${a.seed}&model=${a.model}&nologo=true`
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(a.timeoutMs),
        headers: { 'User-Agent': UA },
      })
      if (!r.ok) {
        lastErr = `Pollinations (${a.model}) returned ${r.status}`
        continue
      }
      const ct = r.headers.get('content-type') ?? 'image/jpeg'
      const bytes = await r.arrayBuffer()
      // Pollinations sometimes returns an HTML error page with 200 status —
      // sanity-check the size.
      if (bytes.byteLength < 5000) {
        lastErr = `Pollinations (${a.model}) returned a tiny payload (${bytes.byteLength} bytes)`
        continue
      }
      return { bytes, contentType: ct }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
      continue
    }
  }
  throw new Error(`${lastErr}. Try a simpler prompt or switch to OpenAI in a moment.`)
}

async function generateWithOpenAi(opts: { prompt: string; width: number; height: number }) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  // DALL-E 3 accepts a fixed set of sizes — map our requested dims to the
  // closest supported size.
  const aspect = opts.width / opts.height
  const size =
    aspect > 1.3  ? '1792x1024' :
    aspect < 0.77 ? '1024x1792' :
                    '1024x1024'
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: opts.prompt,
      n: 1,
      size,
      quality: 'standard',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`OpenAI returned ${r.status}: ${text.slice(0, 200)}`)
  }
  const json = await r.json() as { data: Array<{ b64_json?: string; url?: string }> }
  const first = json.data?.[0]
  if (!first) throw new Error('OpenAI returned no image')
  let bytes: ArrayBuffer
  if (first.b64_json) {
    const buf = Buffer.from(first.b64_json, 'base64')
    bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } else if (first.url) {
    const dl = await fetch(first.url, { signal: AbortSignal.timeout(60_000) })
    if (!dl.ok) throw new Error(`Couldn't fetch OpenAI image: ${dl.status}`)
    bytes = await dl.arrayBuffer()
  } else {
    throw new Error('OpenAI returned no image data')
  }
  return { bytes, contentType: 'image/png' }
}

// ────────────────────────────────────────────────────────────────────

export async function getAiProviders(): Promise<{ providers: Array<{ id: 'pollinations' | 'openai'; label: string; available: boolean; cost: string }> }> {
  // Exposed as a server action so the picker UI can ask "which providers
  // are enabled?" without exposing the API key itself.
  return {
    providers: [
      { id: 'pollinations', label: 'Pollinations (free)',  available: true,                            cost: 'Free' },
      { id: 'openai',       label: 'OpenAI DALL-E 3',      available: !!process.env.OPENAI_API_KEY,    cost: '~4¢ / image' },
    ],
  }
}

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 80) || `file-${Date.now()}`
}

// Build a storage path like `<tenantId>/<yyyymm>/<random>-<filename>`.
function pathFor(tenantId: string, filename: string): string {
  const d = new Date()
  const yyyymm = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 10)
  return `${tenantId}/${yyyymm}/${rand}-${safeFilename(filename)}`
}

export async function uploadMedia(formData: FormData): Promise<Result<MediaItem>> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const file = formData.get('file') as File | null
  const alt = String(formData.get('alt') ?? '').trim()
  if (!file) return { ok: false, error: 'No file received' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Only image files supported' }
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'File over 10 MB' }

  const path = pathFor(user.tenantId, file.name || 'upload')
  const buf = await file.arrayBuffer()
  const { error: upErr } = await supabase.storage.from('media').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  })
  if (upErr) {
    if (upErr.message?.includes('Bucket not found')) {
      return { ok: false, error: 'Storage bucket "media" missing — apply schema/010 in Supabase.' }
    }
    return { ok: false, error: upErr.message }
  }
  const { data: pub } = supabase.storage.from('media').getPublicUrl(path)

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      tenant_id: user.tenantId,
      url: pub.publicUrl,
      storage_path: path,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      source: 'upload',
      alt_text: alt || null,
      created_by_user_id: user.id,
    })
    .select('id, url, filename, mime_type, width, height, source, prompt, alt_text, tags, created_at')
    .single()
  if (error) {
    if (tableMissing(error.message)) {
      return { ok: false, error: 'media_assets table missing — apply schema/010 in Supabase.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/media')
  return { ok: true, data: data as MediaItem }
}

export async function generateMedia(input: {
  prompt: string
  width?: number
  height?: number
  provider?: 'pollinations' | 'openai'
}): Promise<Result<MediaItem>> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const prompt = input.prompt.trim()
  if (!prompt) return { ok: false, error: 'Describe the image to generate' }
  if (prompt.length > 800) return { ok: false, error: 'Prompt too long (max 800 chars)' }
  const width = input.width ?? 1024
  const height = input.height ?? 1024

  // Provider routing — OpenAI when an API key is present AND the caller
  // asks for it; otherwise Pollinations (free).
  const provider = input.provider ?? 'pollinations'
  const hasOpenAi = !!process.env.OPENAI_API_KEY
  if (provider === 'openai' && !hasOpenAi) {
    return { ok: false, error: 'OpenAI API key not configured on the server. Add OPENAI_API_KEY to .env.local and redeploy.' }
  }

  let bytes: ArrayBuffer
  let contentType = 'image/jpeg'
  try {
    if (provider === 'openai') {
      ;({ bytes, contentType } = await generateWithOpenAi({ prompt, width, height }))
    } else {
      ;({ bytes, contentType } = await generateWithPollinations({ prompt, width, height }))
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI generation failed' }
  }
  const seed = Math.floor(Math.random() * 1_000_000)

  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const path = pathFor(user.tenantId, `ai-${seed}.${ext}`)
  const { error: upErr } = await supabase.storage.from('media').upload(path, bytes, {
    contentType,
    upsert: false,
  })
  if (upErr) {
    if (upErr.message?.includes('Bucket not found')) {
      return { ok: false, error: 'Storage bucket "media" missing — apply schema/010 in Supabase.' }
    }
    return { ok: false, error: upErr.message }
  }
  const { data: pub } = supabase.storage.from('media').getPublicUrl(path)

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      tenant_id: user.tenantId,
      url: pub.publicUrl,
      storage_path: path,
      filename: `ai-${seed}.${ext}`,
      mime_type: contentType,
      width,
      height,
      size_bytes: bytes.byteLength,
      source: 'ai',
      prompt,
      created_by_user_id: user.id,
    })
    .select('id, url, filename, mime_type, width, height, source, prompt, alt_text, tags, created_at')
    .single()
  if (error) {
    if (tableMissing(error.message)) {
      return { ok: false, error: 'media_assets table missing — apply schema/010 in Supabase.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/media')
  return { ok: true, data: data as MediaItem }
}

export async function listMedia(input: {
  source?: 'upload' | 'ai' | 'external' | 'all'
  q?: string
  limit?: number
} = {}): Promise<Result<MediaItem[]>> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  let q = supabase
    .from('media_assets')
    .select('id, url, filename, mime_type, width, height, source, prompt, alt_text, tags, created_at')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 60)
  if (input.source && input.source !== 'all') q = q.eq('source', input.source)
  if (input.q?.trim()) {
    const s = input.q.trim()
    q = q.or(`filename.ilike.%${s}%,alt_text.ilike.%${s}%,prompt.ilike.%${s}%`)
  }
  const { data, error } = await q
  if (error) {
    if (tableMissing(error.message)) return { ok: false, error: 'media_assets table missing — apply schema/010 in Supabase.' }
    return { ok: false, error: error.message }
  }
  return { ok: true, data: (data ?? []) as MediaItem[] }
}

export async function deleteMedia(input: { id: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: row } = await supabase
    .from('media_assets')
    .select('id, storage_path')
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (!row) return { ok: false, error: 'Not found' }
  if (row.storage_path) {
    await supabase.storage.from('media').remove([row.storage_path])
  }
  const { error } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/media')
  return { ok: true, data: undefined }
}
