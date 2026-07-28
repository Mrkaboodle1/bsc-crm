// POST /api/social/publish — publishes a post to Instagram AND/OR the Facebook
// Page via the Meta Graph API, using the Page token stored in env. Owner/manager.
// Body: { campaignId?, caption, imageUrl?, channels?: ('instagram'|'facebook')[] }
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
const V = 'v25.0'
const G = 'https://graph.facebook.com'
const BASE = 'https://app-chi-silk-29.vercel.app'

const abs = (u?: string | null) => !u ? '' : (/^https?:\/\//.test(u) ? u : BASE + (u.startsWith('/') ? u : '/' + u))

async function postInstagram(igId: string, token: string, caption: string, imageUrl: string) {
  if (!imageUrl) return { ok: false, error: 'Instagram needs an image.' }
  if (/\.png(\?|$)/i.test(imageUrl)) return { ok: false, error: 'Instagram only accepts JPEG photos — this one is a PNG. Pick a JPEG photo (e.g. a circus shot) and try again. (Facebook still posted fine.)' }
  // 1. create container
  const c = await fetch(`${G}/${V}/${igId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  })
  const cj = await c.json()
  if (!cj.id) return { ok: false, error: cj.error?.message || 'Could not create IG post' }
  // 2. publish
  const p = await fetch(`${G}/${V}/${igId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: cj.id, access_token: token }),
  })
  const pj = await p.json()
  if (!pj.id) return { ok: false, error: pj.error?.message || 'Could not publish to IG' }
  return { ok: true, id: pj.id }
}

async function postFacebook(pageId: string, token: string, message: string, imageUrl: string) {
  const url = imageUrl ? `${G}/${V}/${pageId}/photos` : `${G}/${V}/${pageId}/feed`
  const body: Record<string, string> = { access_token: token }
  if (imageUrl) { body.url = imageUrl; body.caption = message } else { body.message = message }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!(j.id || j.post_id)) return { ok: false, error: j.error?.message || 'Could not post to Facebook' }
  return { ok: true, id: j.post_id || j.id }
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const IG = process.env.IG_USER_ID, PAGE = process.env.FB_PAGE_ID, TOKEN = process.env.FB_PAGE_TOKEN
  if (!TOKEN || !PAGE) return NextResponse.json({ error: 'Social posting is not connected yet.' }, { status: 400 })

  const b = await req.json().catch(() => ({}))
  const caption = (b.caption ?? '').toString().slice(0, 2200)
  const imageUrl = abs(b.imageUrl)
  const channels: string[] = Array.isArray(b.channels) && b.channels.length ? b.channels : ['instagram', 'facebook']
  if (!caption && !imageUrl) return NextResponse.json({ error: 'Nothing to post.' }, { status: 400 })

  const results: Record<string, { ok: boolean; id?: string; error?: string }> = {}
  if (channels.includes('instagram') && IG) results.instagram = await postInstagram(IG, TOKEN, caption, imageUrl)
  if (channels.includes('facebook')) results.facebook = await postFacebook(PAGE, TOKEN, caption, imageUrl)

  const anyOk = Object.values(results).some((r) => r.ok)
  if (anyOk && b.campaignId) {
    try { await createAdminSupabase().from('campaigns').update({ status: 'sent' }).eq('id', b.campaignId).eq('tenant_id', p.tenant_id) } catch { /* best-effort */ }
  }
  return NextResponse.json({ ok: anyOk, results })
}
