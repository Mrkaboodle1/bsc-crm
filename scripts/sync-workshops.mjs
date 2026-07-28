// Re-sync holiday-workshop bookings from Stripe into the CRM tracker.
// Run: node scripts/sync-workshops.mjs   (from the bsc-crm folder)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY'), STRIPE = g('STRIPE_SECRET_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
const stGet = async u => (await fetch('https://api.stripe.com/v1' + u, { headers: { Authorization: stAuth } })).json()
const sGet = async u => (await fetch(SUPA + '/rest/v1' + u, { headers: sh })).json()
const DAYMAP = { '29th June': '2026-06-29', '30th June': '2026-06-30', '1st July': '2026-07-01', '2nd July': '2026-07-02', '3rd July': '2026-07-03', '7th July': '2026-07-07', '8th July': '2026-07-08', '9th July': '2026-07-09', '10th July': '2026-07-10' }

const tenant = (await sGet('/tenants?select=id&order=created_at&limit=1'))[0].id
const days = (await sGet('/holiday_workshops?select=id,date,title&order=date')).filter(d => !/^Kids Night Out/i.test(d.title))
const idByDate = {}; days.forEach(d => idByDate[d.date] = d.id)

const cutoff = Math.floor(Date.UTC(2026, 3, 1) / 1000)
let charges = [], sa = null, p = 0
do { const j = await stGet(`/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : '')); charges.push(...j.data); sa = j.has_more ? j.data.at(-1).id : null; p++ } while (sa && p < 12)
const wk = charges.filter(c => !c.invoice && c.status === 'succeeded' && /July|June/i.test(c.description || ''))

const bookings = []
for (const c of wk) {
  const desc = c.description || '', amt = c.amount / 100, slots = Math.round(amt / 60)
  const matched = Object.keys(DAYMAP).filter(d => new RegExp(d, 'i').test(desc))
  let who = c.billing_details?.name, email = c.billing_details?.email || c.receipt_email
  let phone = c.billing_details?.phone || null
  if (c.customer) { const cu = await stGet('/customers/' + c.customer); who = who || cu.name; email = email || cu.email; phone = phone || cu.phone || null }
  who = (who || email || 'Stripe booking').replace(/\b(\w+) \1\b/gi, '$1').trim() // de-dupe accidental "Name Name"
  bookings.push({ who, email, phone, days: matched, slots, amt })
}

// rebuild stripe bookings
await fetch(SUPA + '/rest/v1/workshop_bookings?source=eq.stripe', { method: 'DELETE', headers: sh })
const rows = []
for (const b of bookings) {
  if (b.days.length === 1) rows.push({ date: DAYMAP[b.days[0]], who: b.who, email: b.email, phone: b.phone, kids: b.slots, paid: b.amt })
  else for (const d of b.days) rows.push({ date: DAYMAP[d], who: b.who, email: b.email, phone: b.phone, kids: 1, paid: 60 })
}
const insert = rows.filter(r => idByDate[r.date]).map(r => ({ tenant_id: tenant, workshop_id: idByDate[r.date], parent_name: r.who, email: r.email, phone: r.phone, child_count: r.kids, amount_paid: r.paid, paid: true, is_member: false, status: 'booked', source: 'stripe' }))
await fetch(SUPA + '/rest/v1/workshop_bookings', { method: 'POST', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify(insert) })

// report attendees by day
const byDate = {}; days.forEach(d => byDate[d.date] = [])
for (const r of rows) if (byDate[r.date]) byDate[r.date].push(`${r.who}${r.kids > 1 ? ` (${r.kids})` : ''}`)
let tot = 0
console.log('=== WHO IS ATTENDING — each day ===')
const NICE = { '2026-06-29': 'Mon 29 Jun', '2026-06-30': 'Tue 30 Jun', '2026-07-01': 'Wed 1 Jul', '2026-07-02': 'Thu 2 Jul', '2026-07-03': 'Fri 3 Jul', '2026-07-07': 'Tue 7 Jul', '2026-07-08': 'Wed 8 Jul', '2026-07-09': 'Thu 9 Jul', '2026-07-10': 'Fri 10 Jul' }
for (const d of days) {
  const list = byDate[d.date], n = list.reduce((s, x) => s + (parseInt((x.match(/\((\d+)\)/) || [])[1]) || 1), 0)
  tot += n
  console.log(`\n${NICE[d.date] || d.date} — ${n} kids:`)
  console.log('  ' + (list.length ? list.join(', ') : '(none yet)'))
}
console.log(`\nTOTAL: ${tot} places · ${bookings.length} payments · $${bookings.reduce((s, b) => s + b.amt, 0).toFixed(0)}`)
