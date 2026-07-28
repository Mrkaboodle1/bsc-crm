import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/coach-invite — owner/manager creates a fresh new-coach sign-up link.
export async function POST() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner or manager can create sign-up links' }, { status: 403 })
  }
  const admin = createAdminSupabase()
  const token = (randomUUID() + randomUUID()).replace(/-/g, '').slice(0, 32)
  const { error } = await admin.from('coach_invites').insert({
    tenant_id: user.tenantId,
    token,
    created_by: user.email ?? 'Admin',
    status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, token })
}
