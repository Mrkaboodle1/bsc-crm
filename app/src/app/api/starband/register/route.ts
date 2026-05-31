// POST /api/starband/register
// Two modes:
//   1) Link an existing student to a new band:  { nfc_uid, student_id }
//   2) Create a new student + link the band:    { nfc_uid, first_name, last_name, parent_name?, parent_email?, parent_phone? }

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type Body = {
  nfc_uid?: string; student_id?: string
  first_name?: string; last_name?: string
  parent_name?: string; parent_email?: string; parent_phone?: string
}

export async function POST(req: Request) {
  let body: Body = {}
  try { body = await req.json() } catch { /* ignore */ }
  const nfc_uid = (body.nfc_uid ?? '').toString().trim().toUpperCase()
  if (!nfc_uid) return NextResponse.json({ ok: false, error: 'missing nfc_uid' }, { status: 400 })

  try {
    const sb = await createServerSupabaseAdmin()

    // If this NFC is already attached to someone, refuse.
    const { data: existing } = await sb.from('students').select('id, first_name, last_name').eq('nfc_uid', nfc_uid).maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: false, error: 'already_registered', message: `Band already belongs to ${existing.first_name} ${existing.last_name}.` }, { status: 409 })
    }

    // Pick the active tenant (single-tenant build for now).
    const { data: t } = await sb.from('tenants').select('id').limit(1).maybeSingle()
    const tenant_id = t?.id
    if (!tenant_id) return NextResponse.json({ ok: false, error: 'no_tenant' }, { status: 500 })

    let student_id = (body.student_id ?? '').toString().trim() || null

    if (student_id) {
      const { error } = await sb.from('students').update({ nfc_uid }).eq('id', student_id).eq('tenant_id', tenant_id)
      if (error) throw error
    } else {
      const first_name = (body.first_name ?? '').toString().trim()
      const last_name = (body.last_name ?? '').toString().trim()
      if (!first_name) return NextResponse.json({ ok: false, error: 'missing_name' }, { status: 400 })
      const { data: newStudent, error } = await sb.from('students').insert({
        tenant_id, first_name, last_name, nfc_uid,
        stars_total: 0, xp_total: 0, attendance_streak: 0,
      }).select('id').single()
      if (error) throw error
      student_id = newStudent.id
    }

    return NextResponse.json({ ok: true, student_id, nfc_uid, message: 'StarBand registered.' })
  } catch (err) {
    console.error('starband register error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
