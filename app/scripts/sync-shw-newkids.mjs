// Pull latest Stripe SHW signups and ADD any new kids to the coach roll
// (attendance) that aren't already there. Real names + medical from their waiver.
import fs from 'node:fs'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, STRIPE = env.STRIPE_SECRET_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
const stGet = async (u) => (await fetch('https://api.stripe.com/v1' + u, { headers: { Authorization: stAuth } })).json()
const pk = (s) => (s || '').replace(/\D/g, '').slice(-9)
const nm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')
const cleanName = (s) => s.replace(/\d+\s*(years?|yrs?|yo|y)?/gi, ' ').replace(/[^A-Za-z '\-]/g, ' ').replace(/\s+/g, ' ').trim()

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id
const ws = await (await sb(`holiday_workshops?select=id,date,title&tenant_id=eq.${tid}&date=gte.2026-06-29&date=lte.2026-07-10`)).json()
const wsDays = ws.filter((d) => !/^Kids Night Out/i.test(d.title))
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const patterns = (d) => { const x = new Date(d + 'T00:00:00Z'); return [`${ord(x.getUTCDate())} ${MONTHS[x.getUTCMonth()]}`, `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`] }
const matchers = wsDays.map((d) => ({ id: d.id, date: d.date, pats: patterns(d.date) }))

// waiver lookup by email
const waivers = {}
{ let off = 0; while (true) { const d = await (await sb(`signed_waivers?select=email,children,medical,phone&event_type=eq.shw&limit=1000&offset=${off}`)).json(); d.forEach((w) => { if (w.email) waivers[w.email.toLowerCase()] = w; if (w.phone) waivers[pk(w.phone)] = w }); if (d.length < 1000) break; off += 1000 } }

// Only signups AFTER the master sheet was exported (26 Jun ~10:40am AEST) are "new".
const newCutoff = Math.floor(new Date('2026-06-26T11:00:00+10:00').getTime() / 1000)
// Stripe charges (120 days)
const cutoff = Math.floor((Date.now() - 120 * 86400000) / 1000)
const charges = []; let sa = null, p = 0
do { const j = await stGet(`/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : '')); if (!j.data) break; charges.push(...j.data); sa = j.has_more ? j.data[j.data.length - 1].id : null; p++ } while (sa && p < 12)

// build per-day stripe signups
const byDay = {}
for (const c of charges) {
  if (c.invoice || c.status !== 'succeeded') continue
  if (c.created < newCutoff) continue // only new signups since the sheet
  const desc = String(c.description || ''); if (!/June|July|Workshop|Holiday/i.test(desc)) continue
  const matched = matchers.filter((m) => m.pats.some((pt) => desc.toLowerCase().includes(pt.toLowerCase())))
  if (!matched.length) continue
  const bd = c.billing_details || {}; let who = bd.name || '', email = bd.email || '', phone = bd.phone || ''
  if (c.customer) { const cu = await stGet('/customers/' + c.customer); who = who || cu?.name || ''; email = email || cu?.email || ''; phone = phone || cu?.phone || '' }
  const slots = Math.round((c.amount / 100) / 60)
  for (const m of matched) (byDay[m.date] ||= []).push({ who, email, phone, kids: matched.length === 1 ? slots : 1 })
}

// Phase 1: collect candidates (no inserts yet)
const cands = []
for (const m of matchers) {
  const stripeList = byDay[m.date] || []
  if (!stripeList.length) continue
  const att = await (await sb(`workshop_attendance?select=parent_name,parent_contact&workshop_id=eq.${m.id}`)).json()
  const bks = await (await sb(`workshop_bookings?select=parent_name,phone,child_names,email&workshop_id=eq.${m.id}`)).json()
  const phones = new Set([...att.map((a) => pk(a.parent_contact)), ...bks.map((b) => pk(b.phone))].filter(Boolean))
  const names = new Set([...att.map((a) => nm(a.parent_name)), ...bks.map((b) => nm(b.parent_name))].filter(Boolean))
  const emails = new Set(bks.map((b) => (b.email || '').toLowerCase()).filter(Boolean))
  for (const s of stripeList) {
    if (phones.has(pk(s.phone)) || names.has(nm(s.who)) || (s.email && emails.has(s.email.toLowerCase()))) continue
    const w = waivers[(s.email || '').toLowerCase()] || waivers[pk(s.phone)]
    let kidNames = []
    if (w?.children) kidNames = String(w.children).split(/;|,|&|\band\b/i).map(cleanName).filter((x) => x.length > 1)
    if (!kidNames.length) kidNames = Array.from({ length: s.kids || 1 }, (_, i) => `${(s.who || 'Stripe').split(' ')[0]}'s child${s.kids > 1 ? ' ' + (i + 1) : ''}`)
    const med = w?.medical && !/^(na|nil|none|n\/a|no)$/i.test(String(w.medical).trim()) ? String(w.medical).slice(0, 200) : null
    cands.push({ wid: m.id, date: m.date, s, kidNames, med })
    phones.add(pk(s.phone)); names.add(nm(s.who)); if (s.email) emails.add(s.email.toLowerCase())
  }
}
console.log('=== New signups since 26 June (candidates) ===')
cands.forEach((c) => console.log(`  ${c.date}: ${c.kidNames.join(', ')} (${c.s.who} · ${c.s.email})`))
if (cands.length > 15) { console.log(`\n⚠ SAFETY STOP: ${cands.length} candidates (expected a handful). NOT inserting — needs a look.`); process.exit(0) }
let added = 0
for (const c of cands) {
  const bk = await (await sb('workshop_bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ tenant_id: tid, workshop_id: c.wid, parent_name: c.s.who || '(Stripe booking)', phone: c.s.phone || null, email: c.s.email || null, child_names: c.kidNames.join(', '), child_count: c.kidNames.length, status: 'booked', source: 'stripe', paid: true, amount_paid: (c.s.kids || 1) * 60, notes: 'Paid: Stripe (new signup)' }) })).json()
  const rows = c.kidNames.map((n) => ({ tenant_id: tid, workshop_id: c.wid, booking_id: bk[0]?.id, child_name: n, parent_name: c.s.who || null, parent_contact: c.s.phone || c.s.email || null, medical: c.med, status: 'expected' }))
  await sb('workshop_attendance', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
  added += rows.length
}
const report = cands.map((c) => `${c.date}: + ${c.kidNames.join(', ')} (${c.s.who})`)
console.log('=== New Stripe kids added to the roll ===')
report.forEach((r) => console.log('  ' + r))
console.log('Total new kids added:', added)
let grand = 0
for (const w of ws.sort((a, b) => a.date.localeCompare(b.date))) { const a = await (await sb(`workshop_attendance?select=id&workshop_id=eq.${w.id}`)).json(); if (a.length) console.log(`${w.date}: ${a.length}`); grand += a.length }
console.log('GRAND TOTAL on rolls:', grand)
