import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/stadium-fund — put money in. There is intentionally no route to
// take money out: the fund only ever grows.
export async function POST(req: Request) {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const amount = Number(b.amount)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter an amount greater than zero.' }, { status: 400 })

  const admin = createAdminSupabase()
  const { error } = await admin.from('stadium_fund').insert({
    tenant_id: user.tenantId, amount, note: b.note || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
