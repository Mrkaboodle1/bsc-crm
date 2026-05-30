// Public POST endpoint for the BigStar website chat widget.
// Looks up the site by slug, stores the visitor's message as a `note`
// pending_action against that site's tenant so it surfaces in /inbox.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type Body = { siteSlug?: string; name?: string; email?: string; phone?: string; message?: string }

export async function POST(req: Request) {
  let body: Body = {}
  try { body = await req.json() } catch { /* ignore */ }
  const name = (body.name ?? '').toString().trim().slice(0, 120)
  const email = (body.email ?? '').toString().trim().slice(0, 200)
  const phone = (body.phone ?? '').toString().trim().slice(0, 60)
  const message = (body.message ?? '').toString().trim().slice(0, 4000)
  const siteSlug = (body.siteSlug ?? 'bigstar').toString().trim().slice(0, 80)

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: 'missing required fields' }, { status: 400 })
  }

  try {
    const admin = await createServerSupabaseAdmin()
    const { data: site } = await admin
      .from('sites')
      .select('id, tenant_id, name')
      .eq('slug', siteSlug)
      .maybeSingle()
    if (!site) return NextResponse.json({ ok: true, stored: false }) // silently accept

    await admin.from('pending_actions').insert({
      tenant_id: site.tenant_id,
      kind: 'note',
      triggered_by: 'manual',
      draft_subject: `🌐 Website chat — ${name}`,
      draft_body: `New message from the BigStar website chat widget.\n\n` +
        `From: ${name}\n` +
        `Email: ${email}\n` +
        (phone ? `Phone: ${phone}\n` : '') +
        `\nMessage:\n${message}`,
      draft_recipient: email,
      draft_metadata: { source: 'site_chat_widget', siteSlug, siteName: site.name, name, email, phone, message },
      priority: 'normal',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Always return success so the visitor sees the friendly thank-you. The
    // CRM Engineer + Sentry will catch and report any storage problems.
    console.error('site-message error', err)
    return NextResponse.json({ ok: true, stored: false })
  }
}
