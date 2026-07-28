import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DEFAULT_WELCOME_SECTIONS } from '@/lib/coach-welcome-sections'

export const runtime = 'nodejs'

async function guard() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return null
  return user
}

export async function GET() {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const admin = createAdminSupabase()
  let { data } = await admin.from('coach_welcome_sections').select('id, sort, title, body, active').eq('tenant_id', user.tenantId).order('sort')
  if (!data || data.length === 0) {
    for (let i = 0; i < DEFAULT_WELCOME_SECTIONS.length; i++) {
      const s = DEFAULT_WELCOME_SECTIONS[i]!
      await admin.from('coach_welcome_sections').insert({ tenant_id: user.tenantId, sort: i, title: s.title, body: s.body })
    }
    const re = await admin.from('coach_welcome_sections').select('id, sort, title, body, active').eq('tenant_id', user.tenantId).order('sort')
    data = re.data ?? []
  }
  return NextResponse.json({ ok: true, rows: data })
}

// PUT — save all sections at once (create/update/reorder in one go)
export async function PUT(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const sections = Array.isArray(b.sections) ? b.sections : []
  const admin = createAdminSupabase()
  // wipe + rewrite keeps ordering simple and reliable
  await admin.from('coach_welcome_sections').delete().eq('tenant_id', user.tenantId)
  let i = 0
  for (const s of sections) {
    if (!s.title?.trim()) continue
    await admin.from('coach_welcome_sections').insert({ tenant_id: user.tenantId, sort: i++, title: s.title.trim(), body: s.body || '', active: s.active !== false })
  }
  const { data } = await admin.from('coach_welcome_sections').select('id, sort, title, body, active').eq('tenant_id', user.tenantId).order('sort')
  return NextResponse.json({ ok: true, rows: data ?? [] })
}
