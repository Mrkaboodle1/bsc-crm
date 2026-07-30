// /api/finance/invoices — Big Star Books invoicing (Xero-style). Owner/manager.
// GET (list+lines) · POST (create draft) · PATCH {id, action} · DELETE (?id, drafts)
//   actions: update (edit draft) · approve · send (email PDF) · paid · void
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { rosterPdfBase64 } from '@/lib/roster-pdf'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'
import { computeInvoice } from '@/lib/invoice-calc'
import { supplierBlock, bankBlock } from '@/lib/business-details'

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

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data: invoices, error } = await admin.from('bs_invoices').select('*').eq('tenant_id', g.tenantId).order('created_at', { ascending: false })
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ ok: true, missing: true, rows: [] })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  const ids = (invoices ?? []).map((i) => i.id)
  const { data: lines } = ids.length ? await admin.from('bs_invoice_lines').select('*').in('invoice_id', ids).order('sort') : { data: [] }
  const byInv: Record<string, unknown[]> = {}
  for (const l of lines ?? []) (byInv[l.invoice_id] ||= []).push(l)
  return NextResponse.json({ ok: true, rows: (invoices ?? []).map((i) => ({ ...i, lines: byInv[i.id] ?? [] })) })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const { clean, subtotal, gst, total, mode } = computeInvoice(Array.isArray(b.lines) ? b.lines : [], b.amounts_are)
  if (!clean.length) return NextResponse.json({ error: 'Add at least one line' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: last } = await admin.from('bs_invoices').select('number').eq('tenant_id', g.tenantId).order('created_at', { ascending: false }).limit(1)
  let n = 1001
  const m = last?.[0]?.number ? /(\d+)/.exec(last[0].number) : null
  if (m) n = parseInt(m[1], 10) + 1

  const { data: inv, error } = await admin.from('bs_invoices').insert({
    tenant_id: g.tenantId, number: `INV-${n}`,
    contact_name: String(b.contact_name || '').slice(0, 200) || null,
    contact_email: String(b.contact_email || '').slice(0, 200) || null,
    reference: String(b.reference || '').slice(0, 120) || null,
    amounts_are: mode,
    issue_date: b.issue_date || new Date().toISOString().slice(0, 10),
    due_date: b.due_date || null,
    notes: String(b.notes || '').slice(0, 1000) || null,
    subtotal, gst, total,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('bs_invoice_lines').insert(clean.map((l) => ({ ...l, invoice_id: inv.id, tenant_id: g.tenantId })))
  return NextResponse.json({ ok: true, id: inv.id, number: inv.number })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()

  // Edit an invoice: replace header fields + all lines. Anything that hasn't
  // been PAID is fair game — once money has changed hands the record is locked
  // (void it and reissue instead, so the books stay honest).
  if (b.action === 'update') {
    const { data: existing } = await admin.from('bs_invoices').select('status').eq('id', b.id).eq('tenant_id', g.tenantId).maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'paid') return NextResponse.json({ error: 'Paid invoices are locked — void it and create a new one instead.' }, { status: 400 })
    const { clean, subtotal, gst, total, mode } = computeInvoice(Array.isArray(b.lines) ? b.lines : [], b.amounts_are)
    if (!clean.length) return NextResponse.json({ error: 'Add at least one line' }, { status: 400 })
    await admin.from('bs_invoices').update({
      contact_name: String(b.contact_name || '').slice(0, 200) || null,
      contact_email: String(b.contact_email || '').slice(0, 200) || null,
      reference: String(b.reference || '').slice(0, 120) || null,
      amounts_are: mode,
      issue_date: b.issue_date || new Date().toISOString().slice(0, 10),
      due_date: b.due_date || null,
      notes: String(b.notes || '').slice(0, 1000) || null,
      subtotal, gst, total,
    }).eq('id', b.id).eq('tenant_id', g.tenantId)
    await admin.from('bs_invoice_lines').delete().eq('invoice_id', b.id)
    await admin.from('bs_invoice_lines').insert(clean.map((l) => ({ ...l, invoice_id: b.id, tenant_id: g.tenantId })))
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'approve') {
    await admin.from('bs_invoices').update({ status: 'awaiting' }).eq('id', b.id).eq('tenant_id', g.tenantId).eq('status', 'draft')
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'paid') {
    await admin.from('bs_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', b.id).eq('tenant_id', g.tenantId)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'void') {
    await admin.from('bs_invoices').update({ status: 'void' }).eq('id', b.id).eq('tenant_id', g.tenantId)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'send') {
    const { data: inv } = await admin.from('bs_invoices').select('*').eq('id', b.id).eq('tenant_id', g.tenantId).maybeSingle()
    if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (!inv.contact_email) return NextResponse.json({ error: 'No email on this invoice — add a customer email first.' }, { status: 400 })
    const { data: lines } = await admin.from('bs_invoice_lines').select('*').eq('invoice_id', inv.id).order('sort')

    const RESEND = process.env.RESEND_API_KEY
    if (!RESEND) return NextResponse.json({ error: 'Email is not set up yet.' }, { status: 400 })
    const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
    const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
    const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''

    const gstNote = inv.amounts_are === 'none' ? '(No GST)' : inv.amounts_are === 'inclusive' ? '(GST inclusive)' : '(GST exclusive)'
    const pdfLines: string[] = []
    // Legal identity block first — ABN + address make it a valid tax invoice.
    pdfLines.push(...supplierBlock())
    pdfLines.push(`Invoice to: ${inv.contact_name || '—'}`, '')
    if (inv.reference) pdfLines.push(`Reference: ${inv.reference}`, '')
    for (const l of lines ?? []) pdfLines.push(`- ${l.description || 'Item'}${l.account ? ` [${l.account}]` : ''}  (${l.qty} x ${money(Number(l.unit_price))})  ${money(Number(l.amount))}`)
    pdfLines.push('', `Subtotal: ${money(Number(inv.subtotal))}`, `GST: ${money(Number(inv.gst))} ${gstNote}`, `TOTAL DUE: ${money(Number(inv.total))}`)
    if (inv.due_date) pdfLines.push('', inv.due_date === inv.issue_date ? 'Terms: Due on receipt' : `Due: ${inv.due_date}`)
    if (inv.notes) pdfLines.push('', String(inv.notes))
    pdfLines.push(...bankBlock())
    const pdf = await rosterPdfBase64(`Tax Invoice ${inv.number}`, `${inv.contact_name || ''} · Issued ${inv.issue_date}`, pdfLines)

    const greeting = inv.contact_name ? `Hi ${String(inv.contact_name).split(' ')[0]},` : 'Hi there,'
    const defaultBody = `${greeting}\n\nPlease find attached invoice ${inv.number} for ${money(Number(inv.total))}.${inv.due_date ? ` Payment is due by ${inv.due_date}.` : ''}\n\nThank you for supporting Big Star Circus!`
    // Owner can edit the subject + message before sending (Xero-style).
    const subject = (typeof b.subject === 'string' && b.subject.trim()) ? b.subject.trim().slice(0, 200) : `Invoice ${inv.number} from Big Star Circus`
    const body = (typeof b.message === 'string' && b.message.trim()) ? b.message.trim().slice(0, 4000) : defaultBody
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM}>`, to: inv.contact_email,
          subject,
          text: `${body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(body),
          ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
          attachments: [{ filename: `${inv.number}.pdf`, content: pdf }],
        }),
      })
      if (!res.ok) return NextResponse.json({ error: 'Email failed to send.' }, { status: 400 })
    } catch {
      return NextResponse.json({ error: 'Email failed to send.' }, { status: 400 })
    }
    await admin.from('bs_invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id).eq('tenant_id', g.tenantId)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const url = new URL(req.url)
  // ?id=single or ?ids=a,b,c — batch delete for cleaning out junk invoices.
  // PAID invoices are never deletable this way (they're part of the books) —
  // they are silently skipped and reported back.
  const ids = (url.searchParams.get('ids') || url.searchParams.get('id') || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return NextResponse.json({ error: 'Missing id(s)' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: deletable } = await admin.from('bs_invoices').select('id').eq('tenant_id', g.tenantId).in('id', ids).neq('status', 'paid')
  const okIds = (deletable ?? []).map((d) => d.id)
  if (okIds.length) {
    await admin.from('bs_invoice_lines').delete().eq('tenant_id', g.tenantId).in('invoice_id', okIds)
    await admin.from('bs_invoices').delete().eq('tenant_id', g.tenantId).in('id', okIds)
  }
  return NextResponse.json({ ok: true, deleted: okIds.length, skippedPaid: ids.length - okIds.length })
}
