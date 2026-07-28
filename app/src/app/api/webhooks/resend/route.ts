// POST /api/webhooks/resend — Resend calls this as emails are delivered, opened,
// clicked or bounced. We match each event to a campaign_recipients row by the
// Resend message id and bump its status (only ever upward: sent → delivered →
// opened → clicked). No user auth (Resend is the caller); we only ever touch
// rows whose resend_id we already issued, so a stray POST can do nothing.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const evt = await req.json().catch(() => null)
  const type: string = evt?.type || ''
  const id: string | undefined = evt?.data?.email_id || evt?.data?.id
  if (!type || !id) return NextResponse.json({ ok: true }) // ignore noise

  const admin = createAdminSupabase()
  const now = new Date().toISOString()
  const r = admin.from('campaign_recipients')
  try {
    if (type === 'email.delivered') {
      await r.update({ status: 'delivered' }).eq('resend_id', id).eq('status', 'sent')
    } else if (type === 'email.opened') {
      await r.update({ status: 'opened', opened_at: now }).eq('resend_id', id).in('status', ['sent', 'delivered'])
    } else if (type === 'email.clicked') {
      await r.update({ status: 'clicked', clicked_at: now }).eq('resend_id', id)
    } else if (type === 'email.bounced') {
      await r.update({ status: 'bounced' }).eq('resend_id', id).in('status', ['sent', 'delivered'])
    } else if (type === 'email.complained') {
      await r.update({ status: 'complained' }).eq('resend_id', id)
    }
  } catch { /* table not set up / transient — Resend will retry */ }

  // Also log EVERY event into email_events for the tag-based Statistics view
  // (covers transactional + sequence emails like the free-trial funnel).
  try {
    const d = evt.data || {}
    // Newsletters tag as `campaign_id`; sequence/transactional emails tag as
    // `campaign`. We accept either, otherwise newsletter opens/clicks arrive
    // with no tag and the Statistics view can't attribute a single one.
    const tags: { name: string; value: string }[] = d.tags || []
    const tag = tags.find((t) => t.name === 'campaign')?.value
      ?? tags.find((t) => t.name === 'campaign_id')?.value
      ?? null
    const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
    await admin.from('email_events').insert({
      tenant_id: tenant?.id ?? null,
      resend_id: id,
      event_type: type.replace('email.', ''),
      tag,
      recipient: Array.isArray(d.to) ? d.to[0] : d.to || null,
      subject: d.subject || null,
      link: d.click?.link || null,
      occurred_at: evt.created_at || now,
    })
  } catch { /* email_events table may not exist yet */ }

  return NextResponse.json({ ok: true })
}
