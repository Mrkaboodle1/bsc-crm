// POST /api/campaigns/send — sends an email campaign (newsletter) to a chosen
// audience via Resend, logging each recipient for open/click tracking.
// Body: { campaignId, audience?: 'test'|'all'|'members'|'leads' }. Owner/manager.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { renderNewsletterHtml, type EmailBranding } from '@/lib/newsletter-html'
import type { Block } from '@/components/newsletter-editor'

export const runtime = 'nodejs'
const BASE = 'https://app-chi-silk-29.vercel.app'
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const KEY = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  if (!KEY) return NextResponse.json({ error: 'Email sending is not connected.' }, { status: 400 })

  const b = await req.json().catch(() => ({}))
  const audience: string = b.audience || 'test'
  const admin = createAdminSupabase()

  // 1. Load campaign
  const { data: c, error: ce } = await admin.from('campaigns').select('*').eq('id', b.campaignId).eq('tenant_id', p.tenant_id).maybeSingle()
  if (ce) return NextResponse.json({ error: 'Run the analytics setup first (database).', setup: true }, { status: 400 })
  if (!c || c.channel !== 'email') return NextResponse.json({ error: 'Not an email campaign' }, { status: 400 })

  // 2. Tenant branding
  const { data: t } = await admin.from('tenants').select('name, phone, website').eq('id', p.tenant_id).maybeSingle()
  const branding: EmailBranding = {
    name: t?.name || 'Big Star Circus', logoUrl: '/marketing/logo.png', primary: '#D72027', accent: '#F5A623',
    phone: t?.phone || '0489 188 179', website: (t?.website || 'bigstarcircus.com.au').replace(/^https?:\/\//, ''),
  }
  const monthLabel = c.month ? new Date(c.month + '-01T00:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : ''
  // Use the block layout; fall back to the older field format if not migrated yet.
  let blocks: Block[] = Array.isArray(c.content?.blocks) ? c.content.blocks : []
  if (!blocks.length && c.content) {
    const g = (k: string) => (c.content[k] as string) || ''
    const bid = () => Math.random().toString(36).slice(2)
    if (g('intro')) blocks.push({ id: bid(), type: 'text', text: g('intro') })
    if (g('heroTitle') || g('heroDate')) blocks.push({ id: bid(), type: 'event', title: g('heroTitle'), date: g('heroDate'), blurb: g('heroBlurb'), btnText: 'Book now', btnUrl: '' })
    if (g('whatsOn')) blocks.push({ id: bid(), type: 'heading', text: "📅 What's on" }, { id: bid(), type: 'text', text: g('whatsOn') })
    if (g('classes')) blocks.push({ id: bid(), type: 'heading', text: '🎟️ Classes' }, { id: bid(), type: 'text', text: g('classes') })
  }
  const header = c.content?.header as { show: boolean; title: string; subtitle: string } | undefined
  const html = renderNewsletterHtml({ blocks, subject: c.subject || c.title, branding, monthLabel, baseUrl: BASE, header })
  const subject = c.subject || c.title

  // 3. Recipients
  let recipients: { email: string; name: string | null }[] = []
  if (audience === 'test') {
    recipients = [{ email: auth.user.email || FROM, name: 'Test' }]
  } else {
    let q = admin.from('families').select('primary_parent, family_name, email').eq('tenant_id', p.tenant_id).not('email', 'is', null)
    if (audience === 'members') q = q.eq('lifecycle_stage', 'active')
    else if (audience === 'leads') q = q.eq('lifecycle_stage', 'lead')
    const { data: fam } = await q.limit(5000)
    const seen = new Set<string>()
    for (const f of fam ?? []) {
      const e = (f.email || '').trim().toLowerCase()
      if (e && /@/.test(e) && !seen.has(e)) { seen.add(e); recipients.push({ email: e, name: f.primary_parent || f.family_name }) }
    }
  }
  if (!recipients.length) return NextResponse.json({ error: 'No recipients with an email in that audience.' }, { status: 400 })

  // 4. Send via Resend batch (≤100/call) + log recipients
  let sent = 0
  const rows: Record<string, unknown>[] = []
  for (const group of chunk(recipients, 100)) {
    const payload = group.map((r) => ({ from: `${branding.name} <${FROM}>`, to: [r.email], subject, html, tags: [{ name: 'campaign_id', value: String(c.id) }] }))
    try {
      const res = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      const ids: { id?: string }[] = j.data || []
      group.forEach((r, i) => { rows.push({ tenant_id: p.tenant_id, campaign_id: c.id, email: r.email, name: r.name, resend_id: ids[i]?.id || null, status: res.ok ? 'sent' : 'failed' }); if (res.ok) sent++ })
    } catch {
      group.forEach((r) => rows.push({ tenant_id: p.tenant_id, campaign_id: c.id, email: r.email, name: r.name, status: 'failed' }))
    }
  }

  // 5. Log recipients + mark campaign sent. Never swallow a failure silently —
  // without these rows the Statistics view shows an empty campaign forever.
  let logged = 0
  const logErrors: string[] = []
  for (const grp of chunk(rows, 500)) {
    const { error } = await admin.from('campaign_recipients').insert(grp)
    if (error) logErrors.push(error.message)
    else logged += grp.length
  }
  if (logErrors.length) console.error('[campaigns/send] recipient logging failed:', logErrors[0])
  if (audience !== 'test') await admin.from('campaigns').update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent }).eq('id', c.id).eq('tenant_id', p.tenant_id)

  return NextResponse.json({ ok: true, sent, total: recipients.length, audience, logged, logErrors: logErrors.length ? logErrors.slice(0, 2) : undefined })
}
