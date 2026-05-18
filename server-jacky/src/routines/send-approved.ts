// Picks up rows from pending_actions with status='approved' and sends them
// via the appropriate channel (email via SMTP for now; SMS / FB / IG later).

// Send path: Resend (preferred — sends AS admin@bigstarcircus.com.au with DKIM/SPF)
// falls back to Graph (sends AS rhettbigstar@hotmail.com with Reply-To admin@)
// when RESEND_API_KEY is missing. Titan SMTP is permanently disabled — auth
// failures on every method.
import { sendEmail as sendViaResend } from '../tools/resend.js'
import { sendEmail as sendViaGraph } from '../tools/graph.js'
import { sendSms } from '../tools/clicksend.js'

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

  // Fetch approved actions, oldest first. Pull the DND flags on the
  // related family so we can suppress sends for opt-outs at send-time
  // (rather than at draft-time — Rhett may flip DND after approving).
  const { data, error } = await supabase
    .from('pending_actions')
    .select('id, kind, draft_subject, draft_body, draft_recipient, draft_metadata, related_family_id, family:families!pending_actions_related_family_id_fkey ( dnd_email, dnd_sms, dnd_calls, dnd_all )')
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
      // DND gate — silently skip + mark as "rejected" with a clear reason
      // so it doesn't queue forever. Internal notes never reach send-approved
      // because they're inserted with status='sent', so no gate needed for them.
      const fam = (Array.isArray(action.family) ? action.family[0] : action.family) as
        | { dnd_email?: boolean; dnd_sms?: boolean; dnd_calls?: boolean; dnd_all?: boolean }
        | null
      const dnd = fam ?? {}
      const isEmail = action.kind === 'email_reply' || action.kind === 'email_forward' || action.kind === 'email_outbound'
      const isSms = action.kind === 'sms_reply' || action.kind === 'sms_outbound'
      const blocked = dnd.dnd_all || (isEmail && dnd.dnd_email) || (isSms && dnd.dnd_sms)
      if (blocked) {
        await supabase
          .from('pending_actions')
          .update({
            status: 'rejected',
            rejected_reason: 'Recipient opted out (DND)',
            delivery_metadata: { dnd_blocked: true, channel: isSms ? 'sms' : 'email' },
          })
          .eq('id', action.id)
        logger.info({ id: action.id, kind: action.kind }, '⏭ Skipped — recipient DND')
        continue
      }
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
      } else if (action.kind === 'sms_reply' || action.kind === 'sms_outbound') {
        if (!action.draft_recipient) {
          throw new Error('Missing recipient phone number')
        }
        const result = await sendSms({
          to: action.draft_recipient,
          body: action.draft_body ?? '',
        })
        if (result.ok) {
          await supabase
            .from('pending_actions')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              delivery_metadata: { message_id: result.messageId, channel: 'sms' },
            })
            .eq('id', action.id)
          sent++
          logger.info({ id: action.id, to: action.draft_recipient }, '✅ SMS sent')
        } else {
          await supabase
            .from('pending_actions')
            .update({
              status: 'failed',
              delivery_metadata: { error: result.error, channel: 'sms' },
            })
            .eq('id', action.id)
          failed++
          errors.push(`SMS send failed for ${action.id}: ${result.error}`)
          logger.error({ id: action.id, err: result.error }, '❌ SMS send failed')
        }
      } else {
        // Other kinds (FB DM, IG DM) — not implemented yet
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
