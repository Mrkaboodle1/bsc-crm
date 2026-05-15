// Picks up rows from pending_actions with status='approved' and sends them
// via the appropriate channel (email via SMTP for now; SMS / FB / IG later).

// Send path: Resend (preferred — sends AS admin@bigstarcircus.com.au with DKIM/SPF)
// falls back to Graph (sends AS rhettbigstar@hotmail.com with Reply-To admin@)
// when RESEND_API_KEY is missing. Titan SMTP is permanently disabled — auth
// failures on every method.
import { sendEmail as sendViaResend } from '../tools/resend.js'
import { sendEmail as sendViaGraph } from '../tools/graph.js'

const sendEmail = process.env.RESEND_API_KEY ? sendViaResend : sendViaGraph
import { supabase, getTenantId } from '../tools/supabase.js'
import { logger } from '../logger.js'

export async function sendApprovedActions(): Promise<{
  sent: number
  failed: number
  errors: string[]
  skipped?: number
}> {
  // Safety gate: approved drafts only auto-send when JACKY_AUTO_SEND=true.
  // Default is OFF because we're sending via rhettbigstar@hotmail.com (Graph)
  // instead of admin@bigstarcircus.com.au — Rhett should flip this on once
  // Resend (or another admin@-authenticated outbound) is wired up.
  const autoSend = (process.env.JACKY_AUTO_SEND ?? 'false').toLowerCase() === 'true'
  if (!autoSend) {
    return { sent: 0, failed: 0, errors: [], skipped: 0 }
  }
  const tenantId = await getTenantId()
  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Fetch approved actions, oldest first
  const { data, error } = await supabase
    .from('pending_actions')
    .select('id, kind, draft_subject, draft_body, draft_recipient, draft_metadata')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .is('sent_at', null)
    .order('approved_at', { ascending: true })
    .limit(10)

  if (error) {
    return { sent: 0, failed: 0, errors: [`Fetch error: ${error.message}`] }
  }

  if (!data || data.length === 0) {
    return { sent: 0, failed: 0, errors: [] }
  }

  logger.info({ count: data.length }, 'Found approved actions to send')

  for (const action of data) {
    try {
      if (action.kind === 'email_reply' || action.kind === 'email_forward') {
        if (!action.draft_recipient) {
          throw new Error('Missing recipient')
        }
        const meta = (action.draft_metadata ?? {}) as Record<string, unknown>
        const inReplyToId = typeof meta.in_reply_to === 'string' ? meta.in_reply_to : undefined

        const result = await sendEmail({
          to: action.draft_recipient,
          subject: action.draft_subject ?? '(no subject)',
          bodyText: action.draft_body ?? '',
          inReplyToId,
        })

        if (result.ok) {
          await supabase
            .from('pending_actions')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              delivery_metadata: { message_id: result.messageId },
            })
            .eq('id', action.id)
          sent++
          logger.info({ id: action.id, to: action.draft_recipient }, '✅ Email sent')
        } else {
          await supabase
            .from('pending_actions')
            .update({
              status: 'failed',
              delivery_metadata: { error: result.error },
            })
            .eq('id', action.id)
          failed++
          errors.push(`Send failed for ${action.id}: ${result.error}`)
          logger.error({ id: action.id, err: result.error }, '❌ Email send failed')
        }
      } else {
        // Other kinds (SMS, FB, IG) — not implemented yet
        logger.warn({ kind: action.kind, id: action.id }, 'Action kind not yet implemented')
      }
    } catch (e) {
      failed++
      const msg = (e as Error).message
      errors.push(`Action ${action.id}: ${msg}`)
      await supabase
        .from('pending_actions')
        .update({ status: 'failed', delivery_metadata: { error: msg } })
        .eq('id', action.id)
    }
  }

  return { sent, failed, errors }
}
