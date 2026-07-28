// Analyse the SHW + Free Trial waiver sheets and compare to what's in the CRM.
// Read-only: counts, money, kids, vouchers, duplicates. No writes.
import fs from 'node:fs'
const DIR = 'C:/Users/Rhett Morrow/my-assistant/waiver-imports/'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p) => fetch(`${SB}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' } })

function parseCsv(text) {
  const rows = []; let f = '', row = [], q = false
  for (let i = 0; i < text.length; i++) { const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
    else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' } else if (c === '\r') {} else f += c } }
  if (f.length || row.length) { row.push(f); rows.push(row) }
  return rows
}
const money = (s) => { const m = /([\d,]+(?:\.\d+)?)/.exec(String(s || '').replace(/,/g, '')); return m ? parseFloat(m[1]) : 0 }

function analyseSHW(file, label) {
  const rows = parseCsv(fs.readFileSync(DIR + file, 'utf8'))
  const head = rows[0].map((h) => h.trim())
  const ix = (n) => head.findIndex((h) => h.toLowerCase().startsWith(n.toLowerCase()))
  const iName = ix('Parent'), iPay = ix('Payment Amount'), iStatus = ix('Payment Status'), iOrder = ix('Order Id'), iNotes = ix('Other Notes')
  const iChild = [ix('Child 1'), ix('Child 2'), ix('Child 3'), ix('Child 4')]
  let subs = 0, kids = 0, paid = 0, paidAll = 0, vouchers = 0, pending = 0
  const orders = new Set(); let dupes = 0
  const voucherRows = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; if (!row || !(row[iName] || '').trim()) continue
    const order = (row[iOrder] || '').trim()
    if (order && orders.has(order)) { dupes++; continue }
    if (order) orders.add(order)
    subs++
    const kc = iChild.filter((c) => c >= 0 && (row[c] || '').trim()).length
    kids += kc || 1
    const amt = money(row[iPay]); paidAll += amt
    const status = (row[iStatus] || '').trim()
    if (/success/i.test(status)) paid += amt; else if (/pending/i.test(status)) pending++
    const blob = ((row[iNotes] || '') + ' ' + (row[iPay] || '')).toLowerCase()
    if (/voucher|play ?on/.test(blob) || (status && /pending/i.test(status))) { vouchers++; voucherRows.push(`${(row[iName] || '').trim()} | ${row[iPay]} | ${status} | ${(row[iNotes] || '').replace(/\s+/g, ' ').slice(0, 60)}`) }
  }
  console.log(`\n=== ${label} (${file.slice(0, 20)}…) ===`)
  console.log(`Submissions (deduped by Order Id): ${subs}  | in-file duplicates skipped: ${dupes}`)
  console.log(`Total child spots: ${kids}`)
  console.log(`Money — Success: $${paid.toFixed(2)} | incl. Pending: $${paidAll.toFixed(2)} | Pending (voucher?) count: ${pending}`)
  console.log(`Rows mentioning voucher / Play On / pending: ${vouchers}`)
  if (voucherRows.length) { console.log('  Voucher / pending rows:'); voucherRows.forEach((v) => console.log('   • ' + v)) }
  return orders
}

const newSHW = analyseSHW('SHW 26th June updated 7e70f1c8-e779-490d-b6d6-2a2e0d5f4156.csv', 'SHW — 26 June updated')
const oldSHW = analyseSHW('SHW cfa227f5-ed7d-4310-93e9-48450cd9abe8.csv', 'SHW — earlier export')
const newInOld = [...newSHW].filter((o) => oldSHW.has(o)).length
console.log(`\nOrders in BOTH SHW files: ${newInOld} | brand-new in the 26 June file: ${newSHW.size - newInOld}`)

analyseSHW('Free trial 26 june updated 87a6ef60-44b7-4ef5-9b94-2b8140c5d03c.csv', 'FREE TRIAL — 26 June updated')

console.log('\n=== CRM current state ===')
for (const t of ['signed_waivers', 'workshop_bookings', 'families', 'students']) {
  try { const r = await sb(`${t}?select=id`); console.log(`${t}: ${(r.headers.get('content-range') || '').split('/')[1] || '?'}`) } catch (e) { console.log(`${t}: ?`) }
}
