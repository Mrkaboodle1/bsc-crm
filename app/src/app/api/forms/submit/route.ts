import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { fireAutomationEvent } from '@/lib/automation'

export const runtime = 'nodejs'

// Public POST — a website lead-capture form submission. Creates a contact
// (families row, lifecycle 'lead') and a note so it appears in Chat. No auth.
type Answer = { label?: string; value?: string; type?: string }
type Body = { formSlug?: string; name?: string; email?: string; phone?: string; childAge?: string; message?: string; tenantSlug?: string; noContact?: boolean; answers?: Answer[] }

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

  const noContact = b.noContact === true
  if (!noContact && (!name || (!email && !phone))) return NextResponse.json({ ok: false, error: 'Please add your name and an email or phone.' }, { status: 400 })

  try {
    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id, name').eq('slug', tenantSlug).maybeSingle()
    if (!tenant) return NextResponse.json({ ok: true, stored: false })

    let fam: { id: string } | null = null
    if (!noContact) {
      const ins = await admin.from('families').insert({
        tenant_id: tenant.id,
        family_name: name,
        primary_parent: name,
        email: email || null,
        phone: phone || null,
        source: 'other',
        lifecycle_stage: 'lead',
        tags: ['web-form', formSlug],
      }).select('id').single()
      fam = ins.data
    }

    // Structured submission for analytics (best-effort — ignore if table missing).
    if (Array.isArray(b.answers) && b.answers.length) {
      try {
        const { data: form } = await admin.from('forms').select('id').eq('tenant_id', tenant.id).eq('slug', formSlug).maybeSingle()
        await admin.from('form_submissions').insert({
          tenant_id: tenant.id, form_id: form?.id ?? null, form_slug: formSlug,
          name: name || null, email: email || null, phone: phone || null,
          answers: b.answers.map((a) => ({ label: String(a.label ?? ''), value: String(a.value ?? ''), type: String(a.type ?? '') })),
        })
      } catch { /* table not set up yet */ }
    }

    await admin.from('pending_actions').insert({
      tenant_id: tenant.id,
      kind: 'note',
      triggered_by: 'manual',
      draft_subject: `${noContact ? '🗳️ Survey' : '📝 Form'}: ${formSlug}${name ? ` — ${name}` : ''}`,
      draft_body: `New ${formSlug} submission.\n${name ? `Name: ${name}\n` : ''}` +
        (email ? `Email: ${email}\n` : '') + (phone ? `Phone: ${phone}\n` : '') +
        (childAge ? `Child age: ${childAge}\n` : '') + (message ? `\n${message}` : ''),
      draft_recipient: email || null,
      draft_metadata: { source: 'site_chat_widget', form: formSlug, name, email, phone, childAge, message, familyId: fam?.id },
      priority: 'normal',
    })

    // Feed the central Hive: a real new lead (not an anonymous survey) →
    // triggers the new-lead welcome automation. Best-effort, never blocks.
    if (!noContact && fam?.id) {
      await fireAutomationEvent(tenant.id, 'lead.created', {
        familyId: fam.id, name, email, phone, childAge, message,
        form: formSlug, source: 'web-form',
      }, tenant.name)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('forms/submit error', err)
    return NextResponse.json({ ok: true, stored: false })
  }
}
