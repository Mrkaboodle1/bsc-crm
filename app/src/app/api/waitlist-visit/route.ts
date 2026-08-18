import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public beacon — fired once when someone LANDS on a waitlist page, so every
// ad click is counted in the CRM even if they never fill the form. Feeds the
// Friday cost-per-lead numbers.

const s = (v: unknown, n: number) => (v ?? '').toString().trim().slice(0, n)

export async function POST(req: Request) {
  try {
    let b: Record<string, unknown> = {}
    try { b = await req.json() } catch { /* ignore */ }
    const suburb = s(b.suburb, 40).toLowerCase()
    if (!suburb) return NextResponse.json({ ok: true })

    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'bigstarcircus').maybeSingle()
    if (!tenant) return NextResponse.json({ ok: true })

    await admin.from('site_visits').insert({
      tenant_id: tenant.id,
      visitor_id: s(b.visitorId, 80) || null,
      path: `/waitlist/${suburb}`,
      referrer: s(b.referrer, 300) || null,
      source: s(b.utmSource, 60) || 'direct',
      utm_source: s(b.utmSource, 60) || null,
      utm_campaign: s(b.utmCampaign, 120) || null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // beacons never error at the visitor
  }
}
