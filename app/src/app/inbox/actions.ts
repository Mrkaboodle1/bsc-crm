'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { sendSms } from '@/lib/sms'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

type Result = { ok: true } | { ok: false; error: string }

// Actually deliver an approved email/SMS draft. Email goes via Resend with the
// reply-to pointed at the CRM inbox so the parent's reply threads back in; SMS
// goes via ClickSend. Honors Do-Not-Disturb. Internal notes never send.
async function deliverApproved(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: a } = await supabase
    .from('pending_actions')
    .select('id, kind, draft_subject, draft_body, draft_recipient, related_family_id, status')
    .eq('id', id).maybeSingle()
  if (!a) return
  const isEmail = a.kind === 'email_reply', isSms = a.kind === 'sms_reply'
  if (!isEmail && !isSms) return
  if (!a.draft_recipient) return

  // Do-Not-Disturb (columns may not exist on older DBs → ignore errors).
  try {
    if (a.related_family_id) {
      const { data: fam } = await supabase.from('families').select('dnd_all, dnd_email, dnd_sms').eq('id', a.related_family_id).maybeSingle()
      const f = (fam ?? {}) as Record<string, boolean>
      if (f.dnd_all || (isEmail && f.dnd_email) || (isSms && f.dnd_sms)) {
        await supabase.from('pending_actions').update({ status: 'rejected', rejected_reason: 'Do Not Disturb is on for this contact' }).eq('id', a.id)
        return
      }
    }
  } catch { /* DND columns missing — proceed */ }

  let ok = false
  if (isEmail) {
    const RESEND = process.env.RESEND_API_KEY
    const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
    const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
    const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
    if (RESEND) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: a.draft_recipient, subject: a.draft_subject || 'Message from Big Star Circus', text: `${a.draft_body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(a.draft_body || ''), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
        })
        ok = r.ok
      } catch { ok = false }
    }
  } else if (isSms) {
    const res = await sendSms(a.draft_recipient, a.draft_body || '')
    ok = res.ok
  }
  if (ok) await supabase.from('pending_actions').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', a.id)
}

export async function approveAction(id: string): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending') // only approve pending; protect against double-tap

  if (error) return { ok: false, error: error.message }
  await deliverApproved(supabase, id)
  revalidatePath('/inbox')
  return { ok: true }
}

export async function rejectAction(id: string, reason: string | null): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'rejected',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
      rejected_reason: reason,
    })
    .eq('id', id)
    .in('status', ['pending', 'snoozed'])

  if (error) return { ok: false, error: error.message }
  revalidatePath('/inbox')
  return { ok: true }
}

export async function editAndApproveAction(input: {
  id: string
  draftSubject: string
  draftBody: string
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      draft_subject: input.draftSubject,
      draft_body: input.draftBody,
      approved_edits: input.draftBody,
      status: 'approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }
  await deliverApproved(supabase, input.id)
  revalidatePath('/inbox')
  return { ok: true }
}
