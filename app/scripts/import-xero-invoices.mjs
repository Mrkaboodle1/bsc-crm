// One-off: copy every Xero sales invoice (ACCREC) into Big Star Books, with full
// detail (lines, contact, dates, GST, totals, status). Idempotent — skips any
// invoice number already present. Safe to re-run.
import fs from 'node:fs'
import os from 'node:os'

// ---- env ----
const envRaw = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = {}
for (const l of envRaw.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const xe = JSON.parse(fs.readFileSync(os.homedir() + '/.claude.json', 'utf8')).mcpServers.xero.env

const sb = (path, opts = {}) => fetch(`${SB}/rest/v1/${path}`, { ...opts, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) } })

const parseDate = (v) => { if (!v) return null; const m = /\/Date\((-?\d+)/.exec(v); return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null }
const statusMap = { DRAFT: 'draft', SUBMITTED: 'awaiting', AUTHORISED: 'awaiting', PAID: 'paid', VOIDED: 'void' }
const amountsMap = { Exclusive: 'exclusive', Inclusive: 'inclusive', NoTax: 'none' }
const isEmail = (s) => /\S+@\S+\.\S+/.test(s || '')

async function main() {
  // tenant
  const tRes = await sb('tenants?select=id&order=created_at.asc&limit=1')
  const tenantId = (await tRes.json())[0]?.id
  if (!tenantId) throw new Error('no tenant')

  // existing numbers to skip
  const existing = new Set()
  let from = 0
  while (true) {
    const r = await sb(`bs_invoices?select=number&limit=1000&offset=${from}`)
    const rows = await r.json()
    rows.forEach((x) => existing.add(x.number))
    if (rows.length < 1000) break
    from += 1000
  }
  console.log('Existing invoices already in Big Star Books:', existing.size)

  // Xero token
  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  if (xe.XERO_SCOPES) body.set('scope', xe.XERO_SCOPES)
  const tr = await fetch('https://identity.xero.com/connect/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(xe.XERO_CLIENT_ID + ':' + xe.XERO_CLIENT_SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const tok = (await tr.json()).access_token
  const where = encodeURIComponent('Type=="ACCREC"')

  // collect all
  const invoices = []
  let page = 1
  while (page <= 60) {
    const r = await fetch(`https://api.xero.com/api.xro/2.0/Invoices?where=${where}&page=${page}`, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } })
    if (!r.ok) { console.log('Xero page fail', r.status); break }
    const j = await r.json(); const inv = j.Invoices || []
    if (!inv.length) break
    invoices.push(...inv); page++
  }
  console.log('Fetched from Xero:', invoices.length)

  let inserted = 0, skipped = 0, lineCount = 0
  for (const inv of invoices) {
    const number = inv.InvoiceNumber || ('XERO-' + (inv.InvoiceID || '').slice(0, 8))
    if (existing.has(number)) { skipped++; continue }
    const status = statusMap[inv.Status] || 'draft'
    if (inv.Status === 'DELETED') { skipped++; continue }
    const name = inv.Contact?.Name || null
    const email = inv.Contact?.EmailAddress || (isEmail(name) ? name : null)
    const issue = parseDate(inv.Date)
    const row = {
      tenant_id: tenantId, number,
      contact_name: name, contact_email: email,
      reference: inv.Reference || null,
      amounts_are: amountsMap[inv.LineAmountTypes] || 'exclusive',
      issue_date: issue || new Date().toISOString().slice(0, 10),
      due_date: parseDate(inv.DueDate),
      status,
      subtotal: Number(inv.SubTotal) || 0, gst: Number(inv.TotalTax) || 0, total: Number(inv.Total) || 0,
      paid_at: status === 'paid' ? (parseDate(inv.FullyPaidOnDate) || issue) : null,
      sent_at: inv.SentToContact ? issue : null,
    }
    const ins = await sb('bs_invoices', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
    if (!ins.ok) { console.log('insert fail', number, (await ins.text()).slice(0, 120)); continue }
    const created = (await ins.json())[0]
    inserted++; existing.add(number)
    const lines = (inv.LineItems || []).map((l, i) => ({
      invoice_id: created.id, tenant_id: tenantId,
      description: (l.Description || '').slice(0, 300), account: null,
      qty: Number(l.Quantity) || 1, unit_price: Number(l.UnitAmount) || 0,
      gst: (Number(l.TaxAmount) || 0) > 0, amount: Number(l.LineAmount) || 0, sort: i,
    }))
    if (lines.length) { await sb('bs_invoice_lines', { method: 'POST', body: JSON.stringify(lines) }); lineCount += lines.length }
    if (inserted % 100 === 0) console.log('  …', inserted, 'imported')
  }
  console.log(`\nDONE. Imported ${inserted} invoices (${lineCount} line items). Skipped ${skipped} (already there / deleted).`)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
