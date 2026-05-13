'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type LogPostResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function logPost(formData: FormData): Promise<LogPostResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const caption = String(formData.get('caption') ?? '').trim()
  const platform = String(formData.get('platform') ?? 'instagram')
  const mediaKind = String(formData.get('media_kind') ?? 'ai_generated')
  const mediaUrl = String(formData.get('media_url') ?? '').trim() || null
  const mediaHash = String(formData.get('media_hash') ?? '').trim() || null
  const aiPrompt = String(formData.get('ai_prompt') ?? '').trim() || null
  const status = String(formData.get('status') ?? 'draft')
  const scheduledFor = String(formData.get('scheduled_for') ?? '').trim() || null

  if (!caption) return { ok: false, error: 'Caption is required' }

  const posted_at = status === 'posted' ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from('posted_media')
    .insert({
      tenant_id: user.tenantId,
      caption,
      platform,
      media_kind: mediaKind,
      media_url: mediaUrl,
      media_hash: mediaHash,
      ai_prompt: aiPrompt,
      ai_provider: aiPrompt ? 'pollinations' : null,
      ai_model: aiPrompt ? 'flux' : null,
      status,
      scheduled_for: scheduledFor,
      posted_at,
      posted_by_user_id: user.id,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/marketing')
  redirect('/marketing')
}

export async function checkRecentRepeat(mediaHash: string): Promise<{ blocked: boolean; lastPostedAt: string | null }> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('posted_media')
    .select('posted_at')
    .eq('media_hash', mediaHash)
    .not('posted_at', 'is', null)
    .gt('posted_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return {
    blocked: !!data,
    lastPostedAt: data?.posted_at ?? null,
  }
}
