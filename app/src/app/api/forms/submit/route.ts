import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public POST — a website lead-capture form submission. Creates a contact
// (families row, lifecycle 'lead') and a note so it appears in Chat. No auth.
type Body = { formSlug?: string; name?: string; email?: string; phone?: string; childAge?: string; message?: string; tenantSlug?: string }

export async function POST(req: Request) {
  let b: Body = {}
  try { b = await req.json() } catch { /* ignore */ }
  const name = (b.name ?? '').toString().trim().slice(0, 120)
  const email = (b.email ?? '').toString().trim().slice(0, 200)
  const phone = (b.phone ?? '').toString().trim().slice(0, 60)
  const childAge = (b.childAge ?? '').toString().trim().slice(0, 60)
  const message = (b.message ?? '').toString().trim().slice(0, 4000)
  const formSlug = (b.formSlug ?? 'enquiry').toString().trim().slice(0, 60)
  const tenantSlug = (b.tenantSlug ?? 'bigstarcircus').toString().trim().slice(0, 80)

  if (!name || (!email && !phone)) return NextResponse.json({ ok: false, error: 'Please add your name and an email or phone.' }, { status: 400 })

  try {
    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle()
    if (!tenant) return NextResponse.json({ ok: true, stored: false })

    const { data: fam } = await admin.from('families').insert({
      tenant_id: tenant.id,
      family_name: name,
      primary_parent: name,
      email: email || null,
      phone: phone || null,
      source: 'other',
      lifecycle_stage: 'lead',
      tags: ['web-form', formSlug],
    }).select('id').single()

    await admin.from('pending_actions').insert({
      tenant_id: tenant.id,
      kind: 'note',
      triggered_by: 'manual',
      draft_subject: `📝 Form: ${formSlug} — ${name}`,
      draft_body: `New ${formSlug} form submission.\n\nName: ${name}\n` +
        (email ? `Email: ${email}\n` : '') + (phone ? `Phone: ${phone}\n` : '') +
        (childAge ? `Child age: ${childAge}\n` : '') + (message ? `\nMessage:\n${message}` : ''),
      draft_recipient: email || null,
      draft_metadata: { source: 'site_chat_widget', form: formSlug, name, email, phone, childAge, message, familyId: fam?.id },
      priority: 'normal',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('forms/submit error', err)
    return NextResponse.json({ ok: true, stored: false })
  }
}
