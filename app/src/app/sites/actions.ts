'use server'

// Server actions for the Sites module — create/update/publish/delete
// sites and pages. Every action goes through verifySession() and writes
// tenant_id from the authenticated user.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { type Block, type SiteKind, makeBlock } from '@/lib/sites/blocks'

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function tableMissing(msg: string | undefined): boolean {
  if (!msg) return false
  return msg.includes('does not exist') || msg.includes('relation')
}

// ────────────────────────────────────────────────────────────────────
// Sites
// ────────────────────────────────────────────────────────────────────

export async function createSite(formData: FormData) {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const name = String(formData.get('name') ?? '').trim()
  const kind = (String(formData.get('kind') ?? 'website') as SiteKind)
  const description = String(formData.get('description') ?? '').trim()
  if (!name) return redirect('/sites/new?err=' + encodeURIComponent('Name is required'))
  let slug = slugify(name) || 'site'

  // Ensure unique slug within tenant
  for (let i = 1; i < 25; i++) {
    const { data: exists } = await supabase
      .from('sites')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('slug', slug)
      .maybeSingle()
    if (!exists) break
    slug = `${slugify(name) || 'site'}-${i + 1}`
  }

  const { data, error } = await supabase
    .from('sites')
    .insert({
      tenant_id: user.tenantId,
      name,
      slug,
      kind,
      description: description || null,
      created_by_user_id: user.id,
    })
    .select('id')
    .single()
  if (error) {
    if (tableMissing(error.message)) {
      return redirect('/sites/new?err=' + encodeURIComponent('Sites table missing — apply schema/009 in Supabase.'))
    }
    return redirect('/sites/new?err=' + encodeURIComponent(error.message))
  }

  // Bootstrap with a default home page so the editor opens to something useful.
  await supabase.from('site_pages').insert({
    site_id: data!.id,
    tenant_id: user.tenantId,
    name: 'Home',
    slug: '',
    position: 0,
    blocks: [
      makeBlock('hero'),
      makeBlock('features'),
      makeBlock('cta'),
    ] satisfies Block[],
  })

  revalidatePath('/sites')
  return redirect(`/sites/${data!.id}`)
}

export async function deleteSite(input: { id: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sites')
  return { ok: true }
}

export async function setSitePublished(input: { id: string; published: boolean }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('sites')
    .update({ is_published: input.published, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/sites')
  revalidatePath(`/sites/${input.id}`)
  return { ok: true }
}

// ────────────────────────────────────────────────────────────────────
// Pages
// ────────────────────────────────────────────────────────────────────

export async function createPage(input: { siteId: string; name: string }) {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name is required' } as Result
  let slug = slugify(name) || 'page'
  for (let i = 1; i < 25; i++) {
    const { data: exists } = await supabase
      .from('site_pages')
      .select('id')
      .eq('site_id', input.siteId)
      .eq('slug', slug)
      .maybeSingle()
    if (!exists) break
    slug = `${slugify(name) || 'page'}-${i + 1}`
  }
  // Find current max position so the new page goes at the end of the nav.
  const { data: posRow } = await supabase
    .from('site_pages')
    .select('position')
    .eq('site_id', input.siteId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = (posRow?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('site_pages')
    .insert({
      tenant_id: user.tenantId,
      site_id: input.siteId,
      name,
      slug,
      position: nextPos,
      blocks: [makeBlock('heading'), makeBlock('paragraph')],
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message } as Result
  revalidatePath(`/sites/${input.siteId}`)
  return { ok: true, data: { id: data!.id } } as Result<{ id: string }>
}

export async function savePageBlocks(input: { pageId: string; blocks: Block[]; name?: string; seo_title?: string; seo_description?: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const patch: Record<string, unknown> = {
    blocks: input.blocks,
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.seo_title !== undefined) patch.seo_title = input.seo_title.trim() || null
  if (input.seo_description !== undefined) patch.seo_description = input.seo_description.trim() || null

  const { error } = await supabase
    .from('site_pages')
    .update(patch)
    .eq('id', input.pageId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/sites`)
  return { ok: true }
}

export async function setPagePublished(input: { pageId: string; published: boolean }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('site_pages')
    .update({ is_published: input.published, updated_at: new Date().toISOString() })
    .eq('id', input.pageId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deletePage(input: { pageId: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('site_pages')
    .delete()
    .eq('id', input.pageId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
