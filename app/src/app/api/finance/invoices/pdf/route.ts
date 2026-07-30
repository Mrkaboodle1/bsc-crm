// GET /api/finance/invoices/pdf?id=… — download one invoice as a PDF.
// GET /api/finance/invoices/pdf?month=2026-07 — every non-draft invoice for
// that month compiled into ONE PDF (for handing the accountant a whole month).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { rosterPdfBase64 } from '@/lib/roster-pdf'
import { supplierBlock, bankBlock } from '@/lib/business-details'

export const runtime = 'nodejs'
export const maxDuration = 60

const money = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

function invoiceLines(inv: Record<string, unknown>, lines: Record<string, unknown>[]): string[] {
  const out: string[] = []
  out.push(...supplierBlock())
  out.push(`Invoice to: ${inv.contact_name || '—'}`, '')
  out.push(`Invoice: ${inv.number}   Issued: ${inv.issue_date}   ${inv.due_date === inv.issue_date ? 'Terms: Due on receipt' : `Due: ${inv.due_date || '—'}`}   Status: ${String(inv.status).toUpperCase()}`, '')
  if (inv.reference) out.push(`Reference: ${inv.reference}`, '')
  for (const l of lines) out.push(`- ${l.description || 'Item'}  (${l.qty} x ${money(Number(l.unit_price))})  ${money(Number(l.amount))}`)
  out.push('', `Subtotal: ${money(Number(inv.subtotal))}`, `GST: ${money(Number(inv.gst))}`, `TOTAL: ${money(Number(inv.total))}`)
  if (inv.notes) out.push('', String(inv.notes))
  out.push(...bankBlock())
  return out
}

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const month = url.searchParams.get('month') // YYYY-MM
  const admin = createAdminSupabase()

  if (id) {
    const { data: inv } = await admin.from('bs_invoices').select('*').eq('id', id).eq('tenant_id', g.tenantId).maybeSingle()
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: lines } = await admin.from('bs_invoice_lines').select('*').eq('invoice_id', inv.id).order('sort')
    const pdf = await rosterPdfBase64(`Tax Invoice ${inv.number}`, `${inv.contact_name || ''} · Issued ${inv.issue_date}`, invoiceLines(inv, lines ?? []))
    return new NextResponse(Buffer.from(pdf, 'base64'), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${inv.number}.pdf"` },
    })
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const from = `${month}-01`
    const to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
    const { data: invs } = await admin.from('bs_invoices').select('*').eq('tenant_id', g.tenantId)
      .neq('status', 'draft').gte('issue_date', from).lte('issue_date', to).order('issue_date')
    if (!invs?.length) return NextResponse.json({ error: `No invoices issued in ${month}.` }, { status: 404 })
    const all: string[] = []
    let total = 0, gst = 0
    for (const inv of invs) {
      const { data: lines } = await admin.from('bs_invoice_lines').select('*').eq('invoice_id', inv.id).order('sort')
      all.push('='.repeat(48), '', ...invoiceLines(inv, lines ?? []), '')
      total += Number(inv.total) || 0; gst += Number(inv.gst) || 0
    }
    all.unshift(`${invs.length} invoices issued ${from} to ${to}`, `Combined total: ${money(total)} (incl. ${money(gst)} GST)`, '')
    const pdf = await rosterPdfBase64(`Invoices — ${month}`, 'BIGSTAR CIRCUS PTY LTD — monthly invoice pack', all)
    return new NextResponse(Buffer.from(pdf, 'base64'), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoices-${month}.pdf"` },
    })
  }

  return NextResponse.json({ error: 'Pass ?id= or ?month=YYYY-MM' }, { status: 400 })
}
