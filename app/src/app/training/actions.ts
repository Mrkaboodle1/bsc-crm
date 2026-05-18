'use server'

// Logs a support ticket as an internal pending_action AND queues an email
// draft to admin@bigstarcircus.com.au — so Rhett sees it in /inbox even
// when he's not on the training page.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true } | { ok: false; error: string }

export async function submitSupportTicket(input: { subject: string; body: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) return { ok: false, error: 'Both fields required.' }

  // 1. Drop an internal note for the audit trail
  await supabase.from('pending_actions').insert({
    tenant_id: user.tenantId,
    kind: 'note',
    triggered_by: 'manual',
    draft_subject: `🎫 Support ticket: ${subject}`,
    draft_body: `Submitted by ${user.email}\n\n${body}`,
    draft_metadata: { source: 'training-support-ticket', is_internal: true, composed_by: user.id },
    status: 'sent',
    sent_at: new Date().toISOString(),
    priority: 'normal',
    reasoning: 'Support ticket from /training portal',
    ai_provider: 'manual',
    ai_model: 'support-ticket-v0',
  })

  // 2. Queue an email draft to admin@ so it surfaces in /inbox too
  const { error } = await supabase.from('pending_actions').insert({
    tenant_id: user.tenantId,
    kind: 'email_reply',
    triggered_by: 'manual',
    draft_subject: `🎫 BSC CRM ticket: ${subject}`,
    draft_body: `Hi Rhett,\n\nNew support ticket from the CRM training portal.\n\nFrom: ${user.email}\n${user.fullName ? `Name: ${user.fullName}\n` : ''}\nSubject: ${subject}\n\n---\n${body}\n---\n\nLogged automatically by the BSC CRM.`,
    draft_recipient: 'admin@bigstarcircus.com.au',
    draft_metadata: { source: 'training-support-ticket', composed_by: user.id },
    status: 'pending',
    priority: 'high',
    reasoning: 'Support ticket submitted via /training',
    ai_provider: 'manual',
    ai_model: 'support-ticket-v0',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
