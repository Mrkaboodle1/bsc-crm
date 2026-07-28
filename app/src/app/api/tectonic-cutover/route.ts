import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { importConversations, importLeads } from '@/lib/tectonic-cutover'

export const runtime = 'nodejs'
export const maxDuration = 300

// POST /api/tectonic-cutover — pulls the parent conversations and the leads
// pipeline out of Tectonic into the CRM. Insert-only and keyed on the Tectonic
// id, so it's safe to run again (and again) — it just tops up what's new.
// ?what=conversations | leads | all
export async function POST(req: Request) {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const what = new URL(req.url).searchParams.get('what') || 'all'
  const admin = createAdminSupabase()

  const out: Record<string, unknown> = { ok: true }
  try {
    if (what === 'conversations' || what === 'all') out.conversations = await importConversations(admin, user.tenantId)
    if (what === 'leads' || what === 'all') out.leads = await importLeads(admin, user.tenantId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, partial: out }, { status: 500 })
  }
  return NextResponse.json(out)
}
