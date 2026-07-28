// /api/inbound/sms — receives an SMS reply (from ClickSend's inbound webhook)
// and threads it into the matching family's CRM conversation.
// Secure with INBOUND_SECRET (?token= or x-inbound-secret header).
// ClickSend posts form-encoded or JSON: from / body / message_id.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secret = process.env.INBOUND_SECRET
  if (secret) {
    const url = new URL(req.url)
    if (url.searchParams.get('token') !== secret && req.headers.get('x-inbound-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const ct = req.headers.get('content-type') || ''
  let from = '', body = '', messageId = ''
  try {
    if (ct.includes('application/json')) {
      const b = await req.json()
      from = String(b.from || b.sender || b.originalsenderid || '')
      body = String(b.body || b.message || b.original_body || '')
      messageId = String(b.message_id || b.messageid || b.id || '')
    } else {
      const f = await req.formData()
      from = String(f.get('from') || f.get('sender') || f.get('originalsenderid') || '')
      body = String(f.get('body') || f.get('message') || f.get('original_body') || '')
      messageId = String(f.get('message_id') || f.get('messageid') || '')
    }
  } catch { /* ignore */ }

  const digits = from.replace(/[^\d]/g, '')
  if (!digits || !body.trim()) return NextResponse.json({ ok: true, note: 'nothing to store' })
  const last8 = digits.slice(-8)

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })

  // Match a family by the last 8 digits of the phone number.
  const { data: fam } = await admin.from('families').select('id, primary_parent').eq('tenant_id', tenant.id).ilike('phone', `%${last8}%`).maybeSingle()

  const mid = `sms-${messageId || `${digits}-${Date.now()}`}`
  await admin.from('email_messages').upsert({
    tenant_id: tenant.id, message_id: mid,
    from_email: from, from_name: `SMS · ${from}`,
    subject: null, body_text: body.slice(0, 4000),
    received_at: new Date().toISOString(), matched_family_id: fam?.id ?? null,
  }, { onConflict: 'tenant_id,message_id' })

  return NextResponse.json({ ok: true, matched: !!fam })
}
