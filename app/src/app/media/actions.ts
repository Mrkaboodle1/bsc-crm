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
}): Promise<Result<MediaItem>> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const prompt = input.prompt.trim()
  if (!prompt) return { ok: false, error: 'Describe the image to generate' }
  if (prompt.length > 800) return { ok: false, error: 'Prompt too long (max 800 chars)' }
  const width = input.width ?? 1024
  const height = input.height ?? 1024
  const seed = Math.floor(Math.random() * 1_000_000)

  // Pull the bytes from Pollinations via our own /api/ai-image proxy. We
  // use Pollinations directly here (server-side) so we don't recurse
  // through our own URL.
  const upstream = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`
  let bytes: ArrayBuffer
  let contentType = 'image/jpeg'
  try {
    const r = await fetch(upstream, {
      signal: AbortSignal.timeout(60_000),
      headers: { 'User-Agent': 'BSC-CRM/0.1 (+https://bigstarcircus.com.au)' },
    })
    if (!r.ok) return { ok: false, error: `AI service returned ${r.status}` }
    contentType = r.headers.get('content-type') ?? 'image/jpeg'
    bytes = await r.arrayBuffer()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI generation failed' }
  }

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
