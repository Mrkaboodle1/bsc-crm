// /api/finance/accountant-pack — email the month's Accountant Pack (summary + CSV)
// to the accountant. Owner/manager only.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { buildPack, packCsv } from '@/lib/accountant-pack'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

const money = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const email = String(b.email || '').trim()
  const month = String(b.month || '').trim()
  if (!/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ error: 'Enter a valid accountant email.' }, { status: 400 })
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'Bad month.' }, { status: 400 })

  const admin = createAdminSupabase()
  const pack = await buildPack(admin, g.tenantId, month)
  const csv = packCsv(pack)

  // Remember the accountant's email for next time.
  try {
    const { data: t } = await admin.from('tenants').select('settings').eq('id', g.tenantId).maybeSingle()
    const settings = (t?.settings ?? {}) as Record<string, unknown>
    settings.accountantEmail = email
    await admin.from('tenants').update({ settings }).eq('id', g.tenantId)
  } catch { /* non-fatal */ }

  const RESEND = process.env.RESEND_API_KEY
  if (!RESEND) return NextResponse.json({ error: 'Email is not set up yet.' }, { status: 400 })
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || 'rhettbigstar@hotmail.com'

  const body =
    `Hi,\n\nHere is the Big Star Circus accountant pack for ${pack.monthLabel}.\n\n` +
    `Total income: ${money(pack.incomeTotal)}\n` +
    `Total expenses: ${money(pack.expenseTotal)}\n` +
    `Net profit: ${money(pack.net)}\n\n` +
    `GST collected: ${money(pack.gst.collected)}\n` +
    `GST credits: ${money(pack.gst.credits)}\n` +
    `Net GST ${pack.gst.net >= 0 ? 'owed to ATO' : 'refund'}: ${money(Math.abs(pack.gst.net))}\n` +
    (pack.payroll ? `\nGross wages: ${money(pack.payroll.gross)}\nSuper: ${money(pack.payroll.super)}\n` : '') +
    (pack.needsReview ? `\nNote: ${pack.needsReview} bank transactions still need a category and are NOT in these totals.\n` : '') +
    `\nThe full categorised breakdown is attached as a CSV. Figures are an estimate compiled from the bank feed — please confirm against source records.`

  const csvB64 = Buffer.from(csv, 'utf8').toString('base64')
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM}>`, to: email,
        subject: `Big Star Circus — Accountant Pack — ${pack.monthLabel}`,
        text: `${body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(body),
        reply_to: REPLY_TO,
        attachments: [{ filename: `BigStar-Accountant-Pack-${month}.csv`, content: csvB64 }],
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Email failed to send.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Email failed to send.' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
