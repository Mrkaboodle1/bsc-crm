// Rebuild the SHW coach roll from Rhett's master sheet — into BOTH workshop_bookings
// (drives the count) AND workshop_attendance (the roll coaches see), one row per child.
// Enriches medical from the signed-waiver CSVs (matched by phone). Then does the money.
import fs from 'node:fs'
import XLSX from 'xlsx'
const DIR = 'C:/Users/Rhett Morrow/my-assistant/waiver-imports/'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, STRIPE = env.STRIPE_SECRET_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const pk = (s) => (s || '').replace(/\D/g, '').slice(-9)

// ---- parse master sheet ----
const rows = XLSX.utils.sheet_to_json(XLSX.readFile(DIR + 'SHW Booking Rhett VS.xlsx').Sheets['T2 June-July Holidays'], { header: 1, defval: '' })
const MM = { june: '06', july: '07' }, dayRe = /(\d{1,2})(?:st|nd|rd|th)?\s+(june|july)\s+2026/i
function splitKids(raw) {
  return raw.split(/&|,|\band\b/i).map((p) => p.replace(/\d+\s*(years?|yrs?|yo|y\.?o\.?|y)?/gi, ' ').replace(/[^A-Za-z '\-]/g, ' ').replace(/\s+/g, ' ').trim()).filter((x) => x.length > 1)
}
const days = {}; let cur = null
for (const r of rows) {
  const a = String(r[0] || '').trim(); const m = dayRe.exec(a)
  if (m) { cur = `2026-${MM[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`; days[cur] = days[cur] || []; continue }
  if (/childs name|^full day|^half day|coach|^key$/i.test(a)) continue
  const child = String(r[1] || '').trim(); if (!cur || !child) continue
  if (/\b(total|tally|enrolled|grand)\b|day tally|kids enrolled/i.test(child)) continue // skip summary/tally rows
  days[cur].push({ child, age: String(r[2] || '').trim(), carer: String(r[3] || '').trim(), phone: String(r[4] || '').trim(), emerg: String(r[5] || '').trim(), pay: String(r[6] || '').trim(), extra: String(r[7] || '').trim(), kids: splitKids(child) })
}

// ---- waiver medical map (by phone) ----
function parseCsv(t) { const o = []; let f = '', row = [], q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f); o.push(row); row = []; f = '' } else if (c === '\r') {} else f += c } } if (f.length || row.length) { o.push(f); o.push(row) } return o }
const medByPhone = {}
for (const file of ['SHW 26th June updated 7e70f1c8-e779-490d-b6d6-2a2e0d5f4156.csv', 'SHW cfa227f5-ed7d-4310-93e9-48450cd9abe8.csv']) {
  const rws = parseCsv(fs.readFileSync(DIR + file, 'utf8')); const h = rws[0].map((x) => String(x).trim())
  const ip = h.findIndex((x) => x.toLowerCase().startsWith('phone')), im = h.findIndex((x) => x.toLowerCase().startsWith('medical')), ie = h.findIndex((x) => x.toLowerCase().startsWith('emergency'))
  for (let r = 1; r < rws.length; r++) { const k = pk(rws[r][ip]); if (k && rws[r][im]) medByPhone[k] = { medical: String(rws[r][im]).trim(), emerg: String(rws[r][ie] || '').trim() } }
}
const medKeywords = (t) => { const f = [], s = t.toLowerCase(); for (const [re, lab] of [[/ndis/, 'NDIS'], [/adhd/, 'ADHD'], [/asd|autis/, 'ASD'], [/asthma/, 'Asthma'], [/allerg|anaphyl|epipen|penicillin|nut|fish/, 'Allergy'], [/anxiety/, 'Anxiety'], [/diabet/, 'Diabetes']]) if (re.test(s)) f.push(lab); return f }
const payType = (t) => { const s = t.toLowerCase(); if (/play ?on|voucher/.test(s)) return 'Play On voucher'; if (/stripe/.test(s)) return 'Stripe'; if (/ndis/.test(s)) return 'NDIS'; if (/cash/.test(s)) return 'Cash'; if (/subscri|member/.test(s)) return 'Member'; return 'Unknown' }

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id

// ---- rebuild bookings + attendance per day ----
let report = [], grand = 0, byPay = {}
for (const date of Object.keys(days).sort()) {
  const ws = await (await sb(`holiday_workshops?select=id&tenant_id=eq.${tid}&date=eq.${date}`)).json()
  if (!ws.length) { report.push(`${date}: no workshop in CRM`); continue }
  const wid = ws[0].id
  await sb(`workshop_attendance?workshop_id=eq.${wid}`, { method: 'DELETE' })
  await sb(`workshop_bookings?workshop_id=eq.${wid}`, { method: 'DELETE' })
  let dayKids = 0
  for (const row of days[date]) {
    const names = row.kids.length ? row.kids : [row.child]
    const blob = [row.child, row.emerg, row.pay, row.extra].join(' ')
    const pt = payType(blob); byPay[pt] = (byPay[pt] || 0) + names.length
    const wMed = medByPhone[pk(row.phone)]
    const med = [...new Set([...medKeywords(blob), ...(wMed ? medKeywords(wMed.medical) : [])])]
    const medText = [med.join(', '), wMed?.medical].filter(Boolean).join(' — ').slice(0, 200) || null
    const ownerNote = [pt !== 'Unknown' && `Paid: ${pt}`, row.extra].filter(Boolean).join(' · ') || null // CRM/owner side only
    const coachNote = row.extra || null // what coaches see — NO payment/money info
    // booking (drives count, owner side — keeps payment)
    const bk = await (await sb('workshop_bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ tenant_id: tid, workshop_id: wid, parent_name: row.carer || '(unknown)', phone: row.phone || null, child_names: row.child, child_count: names.length, is_member: pt === 'Member', status: 'booked', source: 'sheet', paid: pt !== 'Unknown', amount_paid: 0, notes: ownerNote }) })).json()
    const bid = bk[0]?.id
    // attendance (the roll coaches see) — one per child, no money info
    const att = names.map((n) => ({ tenant_id: tid, workshop_id: wid, booking_id: bid, child_name: n, parent_name: row.carer || null, parent_contact: row.phone || (wMed?.emerg || null), medical: medText, status: 'expected', notes: coachNote }))
    if (att.length) await sb('workshop_attendance', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(att) })
    dayKids += names.length
  }
  grand += dayKids
  report.push(`${date}: ${dayKids} kids on the roll`)
}
console.log('=== Roll rebuilt (bookings + attendance match) ===')
report.forEach((r) => console.log('  ' + r))
console.log('GRAND TOTAL kids on rolls:', grand)
console.log('Kids by payment type:', JSON.stringify(byPay))

// ---- MONEY ----
// Play On voucher revenue = voucher child-days x $60
const voucherKids = byPay['Play On voucher'] || 0
const voucherRev = voucherKids * 60
// Stripe revenue = actual matched charges for the workshop days (last 120 days)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const pats = Object.keys(days).map((d) => { const x = new Date(d + 'T00:00:00Z'); return [`${ord(x.getUTCDate())} ${MONTHS[x.getUTCMonth()]}`, `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`] }).flat()
const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
let stripeRev = 0, stripeCount = 0, sa = null, p = 0
const cutoff = Math.floor((Date.now() - 120 * 86400000) / 1000)
do {
  const j = await (await fetch(`https://api.stripe.com/v1/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : ''), { headers: { Authorization: stAuth } })).json()
  if (!j.data) break
  for (const c of j.data) { if (c.invoice || c.status !== 'succeeded') continue; const d = (c.description || ''); if (pats.some((pt) => d.toLowerCase().includes(pt.toLowerCase()))) { stripeRev += c.amount / 100; stripeCount++ } }
  sa = j.has_more ? j.data[j.data.length - 1].id : null; p++
} while (sa && p < 12)

console.log('\n=== SCHOOL HOLIDAY WORKSHOP — MONEY ===')
console.log(`Stripe (card): $${stripeRev.toFixed(2)} from ${stripeCount} payments`)
console.log(`Play On vouchers: ${voucherKids} child-days x $60 = $${voucherRev.toFixed(2)}`)
console.log(`COMBINED TOTAL: $${(stripeRev + voucherRev).toFixed(2)}`)
