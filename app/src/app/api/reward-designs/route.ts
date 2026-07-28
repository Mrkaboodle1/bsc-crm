// POST /api/reward-designs — add or delete a Star Reward design.
// Stored in tenants.settings.reward_designs (JSON). Owner/manager only.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DEFAULT_DESIGNS, normaliseDesigns, type RewardDesign } from '@/lib/reward-designs'

export const runtime = 'nodejs'

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `design-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Only owners/managers can edit designs' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()
  const { data: t } = await admin.from('tenants').select('settings').eq('id', profile.tenant_id).maybeSingle()
  const settings = (t?.settings ?? {}) as Record<string, unknown>
  // Seed from defaults the first time it's edited so existing cards persist.
  let designs: RewardDesign[] = 'reward_designs' in settings ? normaliseDesigns(settings.reward_designs) : [...DEFAULT_DESIGNS]

  if (body.action === 'add') {
    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const section = ['skill-cards', 'progress-cards', 'books', 'other'].includes(body.section) ? body.section : 'other'
    let id = slug(title)
    while (designs.some((d) => d.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`
    designs.push({
      id, section, title,
      desc: String(body.desc || '').trim(),
      viewUrl: String(body.viewUrl || '').trim() || undefined,
      pdfUrl: String(body.pdfUrl || '').trim() || undefined,
      pages: body.pages ? Number(body.pages) : undefined,
    })
  } else if (body.action === 'update') {
    const id = String(body.id || '')
    const idx = designs.findIndex((d) => d.id === id)
    if (idx < 0) return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const section = ['skill-cards', 'progress-cards', 'books', 'other'].includes(body.section) ? body.section : designs[idx].section
    designs[idx] = {
      ...designs[idx],
      title,
      section,
      desc: String(body.desc || '').trim(),
      viewUrl: String(body.viewUrl || '').trim() || undefined,
      pdfUrl: String(body.pdfUrl || '').trim() || undefined,
      pages: body.pages ? Number(body.pages) : undefined,
    }
  } else if (body.action === 'delete') {
    const id = String(body.id || '')
    designs = designs.filter((d) => d.id !== id)
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { error } = await admin.from('tenants').update({ settings: { ...settings, reward_designs: designs } }).eq('id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, count: designs.length })
}
