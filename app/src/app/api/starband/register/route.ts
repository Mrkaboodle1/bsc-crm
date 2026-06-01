// POST /api/starband/register
// Five modes:
//   1) New student + first band:    { nfc_uid, first_name, last_name, parent_name?, parent_email?, parent_phone?, photo_url?, pin_code? }
//   2) Pair band to existing kid:   { nfc_uid, student_id, kind?, label? }
//   3) Add another tag to a kid:    { nfc_uid, student_id, kind: 'sticker'|'card'|'parent_card', label? }
//   4) Replace lost band:           { nfc_uid, student_id, replace: true }   ← deactivates kid's other wristbands first
//   5) Update student details:      { student_id, photo_url?, pin_code?, parent_email? }   (no nfc_uid)

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type Body = {
  nfc_uid?: string; student_id?: string
  first_name?: string; last_name?: string
  parent_name?: string; parent_email?: string; parent_phone?: string
  photo_url?: string; pin_code?: string
  kind?: 'wristband' | 'sticker' | 'card' | 'parent_card' | 'other'
  label?: string
  replace?: boolean
}

export async function POST(req: Request) {
  let body: Body = {}
  try { body = await req.json() } catch { /* ignore */ }
  const nfc_uid = (body.nfc_uid ?? '').toString().trim().toUpperCase()
  const student_id = (body.student_id ?? '').toString().trim() || null
  const kind = body.kind ?? 'wristband'
  const label = (body.label ?? '').toString().trim() || null

  try {
    const sb = await createServerSupabaseAdmin()

    // Mode 5 — student details only, no tag.
    if (!nfc_uid && student_id) {
      const patch: Record<string, unknown> = {}
      if (body.photo_url != null) patch.photo_url = body.photo_url
      if (body.pin_code != null) patch.pin_code = String(body.pin_code).trim() || null
      if (body.parent_email != null) patch.parent_email = body.parent_email
      const { error } = await sb.from('students').update(patch).eq('id', student_id)
      if (error) throw error
      return NextResponse.json({ ok: true, student_id, message: 'Updated.' })
    }

    if (!nfc_uid) return NextResponse.json({ ok: false, error: 'missing nfc_uid' }, { status: 400 })

    // Single tenant for now.
    const { data: t } = await sb.from('tenants').select('id').limit(1).maybeSingle()
    const tenant_id = t?.id
    if (!tenant_id) return NextResponse.json({ ok: false, error: 'no_tenant' }, { status: 500 })

    // Is this UID already attached to someone (active)?
    const { data: existingTag } = await sb
      .from('nfc_tags').select('id, student_id, kind').eq('nfc_uid', nfc_uid).eq('is_active', true).maybeSingle()
    if (existingTag) {
      const { data: who } = await sb.from('students').select('first_name, last_name').eq('id', existingTag.student_id).maybeSingle()
      return NextResponse.json({
        ok: false, error: 'already_registered',
        message: `That band already belongs to ${who?.first_name ?? '?'} ${who?.last_name ?? ''}.`,
        existing_student_id: existingTag.student_id,
      }, { status: 409 })
    }

    let target_student_id = student_id

    // Mode 1 — create new student + first band.
    if (!target_student_id) {
      const first_name = (body.first_name ?? '').toString().trim()
      if (!first_name) return NextResponse.json({ ok: false, error: 'missing_name' }, { status: 400 })
      const { data: newStudent, error } = await sb.from('students').insert({
        tenant_id, first_name, last_name: (body.last_name ?? '').toString().trim() || '',
        nfc_uid,    // backward-compat: legacy single-band column stays in sync with "primary"
        photo_url: body.photo_url ?? null,
        pin_code: body.pin_code ?? null,
        stars_total: 0, xp_total: 0, attendance_streak: 0,
      }).select('id').single()
      if (error) throw error
      target_student_id = newStudent.id
    }

    // Replace-lost-band: deactivate all this kid's existing wristbands first.
    if (body.replace && kind === 'wristband') {
      await sb.from('nfc_tags').update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('student_id', target_student_id).eq('kind', 'wristband').eq('is_active', true)
    }

    // Create the new active tag.
    await sb.from('nfc_tags').insert({ tenant_id, student_id: target_student_id, nfc_uid, kind, label })

    // Keep students.nfc_uid in sync with the newest wristband (legacy compat).
    if (kind === 'wristband') {
      await sb.from('students').update({ nfc_uid }).eq('id', target_student_id)
    }

    return NextResponse.json({ ok: true, student_id: target_student_id, nfc_uid, kind, message: 'StarBand registered.' })
  } catch (err) {
    console.error('starband register error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
