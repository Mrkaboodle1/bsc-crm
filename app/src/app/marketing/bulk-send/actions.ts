'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type BulkResult =
  | { ok: true; created: number; skipped: number; reasons: string[] }
  | { ok: false; error: string }

/**
 * Creates N pending_actions (one per recipient family) in one Supabase insert.
 * Channel = 'email' → kind='email_outbound', uses family.email.
 * Channel = 'sms'   → kind='sms_outbound',  uses family.phone.
 * The existing send-approved cycle on the VPS picks them up after Rhett
 * approves in /inbox. No actual sending happens here.
 */
export async function createBulkDrafts(formData: FormData): Promise<BulkResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const channel = String(formData.get('channel') ?? 'email')
  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const familyIdsRaw = formData.getAll('family_ids').map(String)
  const familyIds = Array.from(new Set(familyIdsRaw.filter(Boolean)))
  const priority = String(formData.get('priority') ?? 'normal') as 'urgent' | 'high' | 'normal' | 'low'

  if (channel !== 'email' && channel !== 'sms') {
    return { ok: false, error: 'Channel must be email or sms' }
  }
  if (!body) return { ok: false, error: 'Body is required' }
  if (channel === 'email' && !subject) return { ok: false, error: 'Subject is required for email' }
  if (familyIds.length === 0) return { ok: false, error: 'Pick at least one recipient' }

  // Pull each family's contact details so we can populate draft_recipient.
  const { data: families, error: famErr } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone')
    .in('id', familyIds)

  if (famErr) return { ok: false, error: famErr.message }
  if (!families || families.length === 0) return { ok: false, error: 'No matching families' }

  const skipped: string[] = []
  const rows: Array<Record<string, unknown>> = []

  for (const f of families) {
    const recipient = channel === 'email' ? f.email : f.phone
    if (!recipient) {
      skipped.push(`${f.family_name} — no ${channel}`)
      continue
    }
    rows.push({
      tenant_id: user.tenantId,
      kind: channel === 'email' ? 'email_outbound' : 'sms_outbound',
      triggered_by: 'campaign',
      related_family_id: f.id,
      draft_subject: channel === 'email' ? subject : null,
      // Light-touch personalisation: {first_name} placeholder swap.
      draft_body: personalise(body, { first_name: extractFirstName(f.primary_parent), family_name: f.family_name }),
      draft_recipient: recipient,
      draft_metadata: { campaign: true, channel, composed_by: user.id },
      priority,
      reasoning: `Bulk ${channel} campaign — composed by ${user.email ?? 'CRM user'}.`,
      status: 'pending',
      ai_provider: 'manual',
      ai_model: 'crm-bulk-send-v0',
    })
  }

  if (rows.length === 0) {
    return { ok: true, created: 0, skipped: skipped.length, reasons: skipped }
  }

  const { error: insertErr } = await supabase.from('pending_actions').insert(rows)
  if (insertErr) return { ok: false, error: insertErr.message }

  revalidatePath('/inbox')
  revalidatePath('/marketing/bulk-send')
  redirect(`/inbox?filter=pending`)
}

function extractFirstName(primaryParent: string | null): string {
  if (!primaryParent) return 'there'
  return primaryParent.trim().split(/\s+/)[0] ?? 'there'
}

function personalise(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
