'use server'

// Server actions for the contact detail page. All RLS-aware (use the
// session's Supabase client) so a coach can only touch their own tenant's
// rows.

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true } | { ok: false; error: string }

// ────────────────────────────────────────────────────────────────────
// Tags — autocomplete + add + remove
// ────────────────────────────────────────────────────────────────────

export async function listAllTags(): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  // Distinct list across all families in this tenant. Pulls all tag arrays,
  // flattens client-side.
  const { data, error } = await supabase
    .from('families')
    .select('tags')
    .eq('tenant_id', user.tenantId)
    .not('tags', 'is', null)
    .limit(5000)
  if (error) return { ok: false, error: error.message }
  const set = new Set<string>()
  for (const r of data ?? []) for (const t of r.tags ?? []) if (t) set.add(t)
  return { ok: true, tags: [...set].sort() }
}

export async function addTag(input: { contactId: string; tag: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const trimmed = input.tag.trim()
  if (!trimmed) return { ok: false, error: 'Tag cannot be empty' }
  // Read existing tags then write back deduped to avoid race conditions
  const { data: existing, error: readErr } = await supabase
    .from('families')
    .select('tags')
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }
  if (!existing) return { ok: false, error: 'Contact not found' }
  const current = existing.tags ?? []
  if (current.some((t: string) => t.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: true } // already there, treat as success
  }
  const next = [...current, trimmed]
  const { error } = await supabase
    .from('families')
    .update({ tags: next })
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${input.contactId}`)
  revalidatePath('/contacts')
  return { ok: true }
}

export async function removeTag(input: { contactId: string; tag: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: existing } = await supabase
    .from('families')
    .select('tags')
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (!existing) return { ok: false, error: 'Contact not found' }
  const next = (existing.tags ?? []).filter((t: string) => t.toLowerCase() !== input.tag.toLowerCase())
  const { error } = await supabase
    .from('families')
    .update({ tags: next })
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${input.contactId}`)
  revalidatePath('/contacts')
  return { ok: true }
}

// ────────────────────────────────────────────────────────────────────
// Composer — queues an email / SMS draft to /inbox, OR saves an
// admin-only internal note that never leaves the CRM.
// ────────────────────────────────────────────────────────────────────

export type Channel = 'email' | 'sms' | 'internal'

export async function sendComposed(input: {
  contactId: string
  channel: Channel
  subject?: string
  body: string
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const body = input.body.trim()
  if (!body) return { ok: false, error: 'Message body required' }

  // Look up recipient details
  const { data: fam, error: famErr } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone')
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (famErr) return { ok: false, error: famErr.message }
  if (!fam) return { ok: false, error: 'Contact not found' }

  let kind: 'email_reply' | 'sms_reply' | 'note' = 'note'
  let recipient: string | null = null
  let subject: string | null = null

  if (input.channel === 'email') {
    if (!fam.email) return { ok: false, error: 'Contact has no email on file' }
    kind = 'email_reply'
    recipient = fam.email
    subject = (input.subject ?? '').trim() || `Message from BSC`
  } else if (input.channel === 'sms') {
    if (!fam.phone) return { ok: false, error: 'Contact has no phone on file' }
    kind = 'sms_reply'
    recipient = fam.phone
  } else {
    kind = 'note'
  }

  const { error } = await supabase.from('pending_actions').insert({
    tenant_id: user.tenantId,
    kind,
    triggered_by: 'manual',
    related_family_id: fam.id,
    draft_subject: subject,
    draft_body: body,
    draft_recipient: recipient,
    draft_metadata: {
      source: 'contact-composer',
      composed_by: user.id,
      is_internal: input.channel === 'internal',
      channel: input.channel,
    },
    // Internal notes auto-complete (status='sent') so they don't sit in
    // /inbox waiting for approval. Email/SMS go to /inbox pending review.
    status: input.channel === 'internal' ? 'sent' : 'pending',
    priority: 'normal',
    reasoning: input.channel === 'internal'
      ? `Internal note added by ${user.email}`
      : `Manually composed ${input.channel} from contact page`,
    ai_provider: 'manual',
    ai_model: 'crm-contact-composer-v0',
    ...(input.channel === 'internal' ? { sent_at: new Date().toISOString() } : {}),
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${input.contactId}`)
  return { ok: true }
}

// ────────────────────────────────────────────────────────────────────
// Source attribution — change where the contact came from
// ────────────────────────────────────────────────────────────────────

export async function updateSource(input: { contactId: string; source: string | null }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('families')
    .update({ source: input.source })
    .eq('id', input.contactId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${input.contactId}`)
  return { ok: true }
}
