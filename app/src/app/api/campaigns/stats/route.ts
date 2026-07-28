// GET /api/campaigns/stats?id= — aggregate open/click stats + recipient list for
// a sent email campaign. Owner/manager.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data, error } = await admin.from('campaign_recipients').select('email, name, status, opened_at, clicked_at').eq('campaign_id', id).eq('tenant_id', p.tenant_id).limit(5000)
  if (error) return NextResponse.json({ error: 'setup', setup: true }, { status: 200 })

  const rows = data ?? []
  const total = rows.length
  const n = (f: (s: string) => boolean) => rows.filter((r) => f(r.status)).length
  const delivered = n((s) => ['delivered', 'opened', 'clicked'].includes(s))
  const opened = n((s) => ['opened', 'clicked'].includes(s))
  const clicked = n((s) => s === 'clicked')
  const bounced = n((s) => s === 'bounced')
  const failed = n((s) => s === 'failed')
  const pct = (a: number, b: number) => b ? Math.round((a / b) * 1000) / 10 : 0

  return NextResponse.json({
    total,
    stats: {
      delivered, opened, clicked, bounced, failed,
      deliveredPct: pct(delivered, total), openedPct: pct(opened, delivered), clickedPct: pct(clicked, delivered), bouncedPct: pct(bounced, total),
    },
    recipients: rows.slice(0, 300),
  })
}
