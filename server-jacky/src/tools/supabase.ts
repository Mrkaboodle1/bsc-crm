// Supabase wrapper for server-Jacky. Uses the service-role key so we can
// write to RLS-protected tables on behalf of the BSC tenant.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { logger } from '../logger.js'

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)

let cachedTenantId: string | null = null

export async function getTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', config.supabase.tenantSlug)
    .single()
  if (error || !data) {
    throw new Error(`Couldn't find tenant for slug ${config.supabase.tenantSlug}: ${error?.message}`)
  }
  cachedTenantId = data.id
  return data.id
}

export async function persistEmailMessage(input: {
  messageId: string
  inReplyTo: string | null
  threadKey: string
  fromEmail: string
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  hasAttachments: boolean
  attachmentNames: string[]
  receivedAt: Date
  classification?: string
  classificationConfidence?: number
  classificationNotes?: string
  matchedFamilyId?: string | null
  rawHeaders?: Record<string, string>
}): Promise<{ id: string; existed: boolean }> {
  const tenantId = await getTenantId()

  // Check if already persisted (idempotency)
  const { data: existing } = await supabase
    .from('email_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('message_id', input.messageId)
    .maybeSingle()

  if (existing) {
    return { id: existing.id, existed: true }
  }

  const { data, error } = await supabase
    .from('email_messages')
    .insert({
      tenant_id: tenantId,
      message_id: input.messageId,
      in_reply_to: input.inReplyTo,
      thread_key: input.threadKey,
      from_email: input.fromEmail,
      from_name: input.fromName,
      to_emails: input.toEmails,
      cc_emails: input.ccEmails,
      subject: input.subject,
      body_text: input.bodyText,
      body_html: input.bodyHtml,
      has_attachments: input.hasAttachments,
      attachment_names: input.attachmentNames,
      received_at: input.receivedAt.toISOString(),
      classification: input.classification ?? null,
      classification_confidence: input.classificationConfidence ?? null,
      classification_notes: input.classificationNotes ?? null,
      matched_family_id: input.matchedFamilyId ?? null,
      raw_headers: input.rawHeaders ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`persistEmailMessage failed: ${error?.message}`)
  }
  return { id: data.id, existed: false }
}

export async function enqueueAction(input: {
  kind: 'email_reply' | 'email_forward' | 'sms_reply' | 'fb_message_reply' | 'ig_message_reply' | 'fb_post' | 'ig_post' | 'task' | 'note'
  triggeredBy: 'inbound_email' | 'inbound_sms' | 'inbound_fb_dm' | 'inbound_ig_dm' | 'scheduled_routine' | 'manual' | 'campaign'
  sourceEmailId?: string | null
  relatedFamilyId?: string | null
  draftSubject?: string | null
  draftBody?: string | null
  draftRecipient?: string | null
  draftMetadata?: Record<string, unknown>
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  reasoning?: string | null
  aiProvider?: string
  aiModel?: string
  aiInputTokens?: number
  aiOutputTokens?: number
  aiCostUsd?: number
}): Promise<string> {
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from('pending_actions')
    .insert({
      tenant_id: tenantId,
      kind: input.kind,
      triggered_by: input.triggeredBy,
      source_email_id: input.sourceEmailId ?? null,
      related_family_id: input.relatedFamilyId ?? null,
      draft_subject: input.draftSubject ?? null,
      draft_body: input.draftBody ?? null,
      draft_recipient: input.draftRecipient ?? null,
      draft_metadata: input.draftMetadata ?? {},
      priority: input.priority ?? 'normal',
      reasoning: input.reasoning ?? null,
      status: 'pending',
      ai_provider: input.aiProvider ?? null,
      ai_model: input.aiModel ?? null,
      ai_input_tokens: input.aiInputTokens ?? null,
      ai_output_tokens: input.aiOutputTokens ?? null,
      ai_cost_usd: input.aiCostUsd ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`enqueueAction failed: ${error?.message}`)
  }
  return data.id
}

export async function logAgentActivity(input: {
  routine: string
  startedAt: Date
  finishedAt: Date
  status: 'success' | 'failure'
  emailsRead?: number
  draftsCreated?: number
  actionsSent?: number
  errors?: unknown[]
  logSummary?: string
  aiCostUsd?: number
}): Promise<void> {
  const tenantId = await getTenantId()
  await supabase.from('agent_activity').insert({
    tenant_id: tenantId,
    routine: input.routine,
    started_at: input.startedAt.toISOString(),
    finished_at: input.finishedAt.toISOString(),
    status: input.status,
    emails_read: input.emailsRead ?? 0,
    drafts_created: input.draftsCreated ?? 0,
    actions_sent: input.actionsSent ?? 0,
    errors: input.errors ?? [],
    log_summary: input.logSummary ?? null,
    ai_cost_usd: input.aiCostUsd ?? 0,
  })
}

// Cheap dedup probe — returns true if we already have this Graph/IMAP
// message_id in email_messages. Used before the Claude call to avoid
// re-paying for already-seen emails on startup re-runs.
export async function isEmailAlreadyPersisted(messageId: string): Promise<boolean> {
  if (!messageId) return false
  const tenantId = await getTenantId()
  const { data } = await supabase
    .from('email_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('message_id', messageId)
    .maybeSingle()
  return !!data
}

// Best-effort family matching by sender email.
export async function findFamilyByEmail(email: string): Promise<string | null> {
  if (!email) return null
  const tenantId = await getTenantId()
  const { data } = await supabase
    .from('families')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .maybeSingle()
  return data?.id ?? null
}
