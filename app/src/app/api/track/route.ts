import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/track — PUBLIC. The BigStar website pings this on each page view so
// Rhett can see who's finding us (Google, Facebook, direct) and what they look
// at / search for on the site. Anonymous: a random visitor id in the browser,
// no names, no emails, no cookies beyond that id.

const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/** Turn a referrer URL into a plain-English source. */
function sourceOf(ref: string, utm: string | null): string {
  if (utm) return utm.toLowerCase()
  if (!ref) return 'direct'
  const h = (() => { try { return new URL(ref).hostname.replace(/^www\./, '') } catch { return '' } })()
  if (!h) return 'direct'
  if (/google\./.test(h)) return 'google'
  if (/bing\./.test(h)) return 'bing'
  if (/duckduckgo/.test(h)) return 'duckduckgo'
  if (/facebook|fb\.|meta\./.test(h)) return 'facebook'
  if (/instagram/.test(h)) return 'instagram'
  if (/tiktok/.test(h)) return 'tiktok'
  if (/youtube|youtu\.be/.test(h)) return 'youtube'
  if (/bigstarcircus/.test(h)) return 'internal'
  return h
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const path = String(b.path || '/').slice(0, 300)
    const referrer = String(b.referrer || '').slice(0, 500)
    const utmSource = b.utm_source ? String(b.utm_source).slice(0, 80) : null
    const admin = createAdminSupabase()

    const { error } = await admin.from('site_visits').insert({
      tenant_id: TENANT,
      visitor_id: b.visitor_id ? String(b.visitor_id).slice(0, 64) : null,
      path,
      referrer: referrer || null,
      source: sourceOf(referrer, utmSource),
      search_term: b.search_term ? String(b.search_term).slice(0, 200) : null,
      utm_source: utmSource,
      utm_campaign: b.utm_campaign ? String(b.utm_campaign).slice(0, 120) : null,
      country: req.headers.get('x-vercel-ip-country') || null,
    })
    if (error) return NextResponse.json({ ok: false }, { status: 200, headers: CORS })
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch {
    // Tracking must never break the website — always answer politely.
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS })
  }
}
