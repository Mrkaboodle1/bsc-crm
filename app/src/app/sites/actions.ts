'use server'

// Server actions for the Sites module — create/update/publish/delete
// sites and pages. Every action goes through verifySession() and writes
// tenant_id from the authenticated user.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { type Block, type SiteKind, makeBlock } from '@/lib/sites/blocks'
import { getTemplate } from '@/lib/sites/templates'

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
  let newId: string | null = null
  try {
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
      console.error('createSite insert failed', error)
      if (tableMissing(error.message)) {
        return redirect('/sites/new?err=' + encodeURIComponent('Sites table missing — apply schema/009 in Supabase.'))
      }
      // Show full Postgres error (code + message) so RLS / FK violations are
      // visible to the user instead of just failing silently.
      const code = (error as { code?: string }).code
      const msg = `${error.message}${code ? ` [code ${code}]` : ''}`
      return redirect('/sites/new?err=' + encodeURIComponent(msg))
    }

    // Bootstrap with a default home page so the editor opens to something useful.
    const { error: pageError } = await supabase.from('site_pages').insert({
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
    if (pageError) {
      console.error('createSite bootstrap page insert failed', pageError)
    }

    revalidatePath('/sites')
    newId = data!.id
  } catch (e) {
    // redirect() throws a NEXT_REDIRECT signal — bubble that up, don't swallow.
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    if (typeof e === 'object' && e !== null && 'digest' in e &&
        typeof (e as { digest: unknown }).digest === 'string' &&
        (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')) throw e
    console.error('createSite threw', e)
    const msg = e instanceof Error ? e.message : String(e)
    return redirect('/sites/new?err=' + encodeURIComponent(msg))
  }
  if (newId) return redirect(`/sites/${newId}`)
  return redirect('/sites/new?err=' + encodeURIComponent('Unknown error creating site.'))
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

export async function createPage(input: { siteId: string; name?: string; templateId?: string }) {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const tpl = input.templateId ? getTemplate(input.templateId) : null
  const built = tpl ? tpl.build() : { name: 'New page', slug: 'new-page', blocks: [makeBlock('heading'), makeBlock('paragraph')] }
  const name = (input.name?.trim()) || built.name
  let slug = slugify(name) || built.slug || 'page'
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
      blocks: built.blocks,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message } as Result
  revalidatePath(`/sites/${input.siteId}`)
  return { ok: true, data: { id: data!.id } } as Result<{ id: string }>
}

export async function duplicatePage(input: { pageId: string }): Promise<Result<{ id: string }>> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: src, error: srcErr } = await supabase
    .from('site_pages')
    .select('site_id, name, blocks, seo_title, seo_description')
    .eq('id', input.pageId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (srcErr || !src) return { ok: false, error: srcErr?.message ?? 'Source page not found' }
  const name = `${src.name} (copy)`
  let slug = slugify(name) || 'page'
  for (let i = 1; i < 25; i++) {
    const { data: exists } = await supabase
      .from('site_pages')
      .select('id')
      .eq('site_id', src.site_id)
      .eq('slug', slug)
      .maybeSingle()
    if (!exists) break
    slug = `${slugify(name) || 'page'}-${i + 1}`
  }
  const { data: posRow } = await supabase
    .from('site_pages')
    .select('position')
    .eq('site_id', src.site_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data, error } = await supabase
    .from('site_pages')
    .insert({
      tenant_id: user.tenantId,
      site_id: src.site_id,
      name,
      slug,
      position: (posRow?.position ?? -1) + 1,
      blocks: src.blocks,
      seo_title: src.seo_title,
      seo_description: src.seo_description,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/sites/${src.site_id}`)
  return { ok: true, data: { id: data!.id } }
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
