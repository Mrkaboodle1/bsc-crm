// /api/finance/invoices/import-xero-csv — import invoices from Xero's
// "SalesInvoiceTemplate.csv" format. Owner/manager. Rows with the same
// InvoiceNumber become one invoice with multiple lines. Existing numbers skipped.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { computeInvoice } from '@/lib/invoice-calc'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

// CSV parser handling quoted fields, escaped quotes and newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = '', row: string[] = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false } else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function parseFlexDate(s: string): string | null {
  const t = (s || '').trim()
  if (!t) return null
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const MON: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }
  m = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/.exec(t); if (m) return `${m[3]}-${MON[m[2].toLowerCase()] || '01'}-${m[1].padStart(2, '0')}`
  return null
}

const taxToGst = (t: string) => !/FREE|EXEMPT|EXCLUDED|NONE|NOTAX|BASEXCLUDED|GST\s*FREE/i.test(t || '')

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const csv = String(b.csv || '')
  if (!csv.trim()) return NextResponse.json({ error: 'No CSV received.' }, { status: 400 })

  const rows = parseCsv(csv)
  if (rows.length < 2) return NextResponse.json({ error: 'That file has no invoice rows.' }, { status: 400 })
  const header = rows[0].map((h) => h.replace(/^\*/, '').trim().toLowerCase())
  const col = (name: string) => header.indexOf(name.toLowerCase())
  const ix = {
    contact: col('ContactName'), email: col('EmailAddress'), number: col('InvoiceNumber'), reference: col('Reference'),
    date: col('InvoiceDate'), due: col('DueDate'), desc: col('Description'), qty: col('Quantity'),
    unit: col('UnitAmount'), account: col('AccountCode'), tax: col('TaxType'),
  }
  if (ix.number < 0 || ix.desc < 0) return NextResponse.json({ error: "This doesn't look like a Xero invoice CSV (missing InvoiceNumber / Description columns)." }, { status: 400 })

  type Grp = { contact: string; email: string; number: string; reference: string; date: string; due: string; lines: { description: string; account?: string; qty: number; unit_price: number; gst: boolean }[] }
  const groups = new Map<string, Grp>()
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; if (!row || row.every((c) => !c.trim())) continue
    const number = (row[ix.number] || '').trim(); if (!number) continue
    if (!groups.has(number)) {
      groups.set(number, {
        contact: (row[ix.contact] || '').trim(), email: ix.email >= 0 ? (row[ix.email] || '').trim() : '',
        number, reference: ix.reference >= 0 ? (row[ix.reference] || '').trim() : '',
        date: ix.date >= 0 ? (row[ix.date] || '').trim() : '', due: ix.due >= 0 ? (row[ix.due] || '').trim() : '', lines: [],
      })
    }
    const grp = groups.get(number)!
    grp.lines.push({
      description: (row[ix.desc] || '').trim(),
      account: ix.account >= 0 ? (row[ix.account] || '').trim() || undefined : undefined,
      qty: parseFloat(row[ix.qty] || '1') || 1,
      unit_price: parseFloat(row[ix.unit] || '0') || 0,
      gst: ix.tax >= 0 ? taxToGst(row[ix.tax]) : true,
    })
  }

  const admin = createAdminSupabase()
  // existing numbers to skip
  const existing = new Set<string>()
  const nums = [...groups.keys()]
  for (let i = 0; i < nums.length; i += 200) {
    const { data } = await admin.from('bs_invoices').select('number').eq('tenant_id', g.tenantId).in('number', nums.slice(i, i + 200))
    if (data) data.forEach((x) => existing.add(x.number))
  }

  let imported = 0, skipped = 0
  for (const grp of groups.values()) {
    if (existing.has(grp.number)) { skipped++; continue }
    const { clean, subtotal, gst, total } = computeInvoice(grp.lines, 'exclusive')
    if (!clean.length) { skipped++; continue }
    const { data: inv, error } = await admin.from('bs_invoices').insert({
      tenant_id: g.tenantId, number: grp.number,
      contact_name: grp.contact || null, contact_email: grp.email || (grp.contact.includes('@') ? grp.contact : null),
      reference: grp.reference || null, amounts_are: 'exclusive',
      issue_date: parseFlexDate(grp.date) || new Date().toISOString().slice(0, 10),
      due_date: parseFlexDate(grp.due), status: 'draft', subtotal, gst, total,
    }).select('id').single()
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ error: 'missing-table' }, { status: 400 })
      continue
    }
    await admin.from('bs_invoice_lines').insert(clean.map((l) => ({ ...l, invoice_id: inv.id, tenant_id: g.tenantId })))
    imported++; existing.add(grp.number)
  }
  return NextResponse.json({ ok: true, imported, skipped })
}
