// Pull holiday-workshop bookings from Stripe into the CRM (mirrors the daily cron).
import fs from 'node:fs'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, STRIPE = env.STRIPE_SECRET_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
const stGet = async (u) => (await fetch('https://api.stripe.com/v1' + u, { headers: { Authorization: stAuth } })).json()

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const patternsFor = (date) => { const d = new Date(date + 'T00:00:00Z'); const day = d.getUTCDate(); const month = MONTHS[d.getUTCMonth()]; return [`${ord(day)} ${month}`, `${day} ${month}`] }

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id
const back = new Date(); back.setMonth(back.getMonth() - 6)
const ahead = new Date(); ahead.setMonth(ahead.getMonth() + 12)
const days = await (await sb(`holiday_workshops?select=id,date,title,kind&tenant_id=eq.${tid}&date=gte.${back.toISOString().slice(0, 10)}&date=lte.${ahead.toISOString().slice(0, 10)}`)).json()
const workshopDays = days.filter((d) => !/^Kids Night Out/i.test(d.title) && d.kind !== 'event')
const matchers = workshopDays.map((d) => ({ id: d.id, date: d.date, title: d.title, patterns: patternsFor(d.date) }))

const cutoff = Math.floor((Date.now() - 120 * 86400000) / 1000)
const charges = []; let sa = null, p = 0
do { const j = await stGet(`/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : '')); if (!j.data) break; charges.push(...j.data); sa = j.has_more ? j.data[j.data.length - 1].id : null; p++ } while (sa && p < 12)

const rows = []
for (const c of charges) {
  if (c.invoice || c.status !== 'succeeded') continue
  const desc = String(c.description || '')
  if (!/June|July|January|April|September|December|Workshop|Holiday/i.test(desc)) continue
  const amt = c.amount / 100, slots = Math.round(amt / 60)
  const matched = matchers.filter((m) => m.patterns.some((pt) => desc.toLowerCase().includes(pt.toLowerCase())))
  if (!matched.length) continue
  const bd = c.billing_details || {}
  let who = bd.name || '', email = bd.email || null, phone = bd.phone || null
  if (c.customer) { const cu = await stGet('/customers/' + c.customer); who = who || cu?.name || ''; email = email || cu?.email || null; phone = phone || cu?.phone || null }
  who = (who || email || 'Stripe booking').replace(/\b(\w+) \1\b/gi, '$1').trim()
  if (matched.length === 1) rows.push({ workshop_id: matched[0].id, parent_name: who, email, phone, child_count: slots, amount_paid: amt })
  else for (const m of matched) rows.push({ workshop_id: m.id, parent_name: who, email, phone, child_count: 1, amount_paid: 60 })
}

const ids = matchers.map((m) => m.id)
for (let i = 0; i < ids.length; i += 50) await sb(`workshop_bookings?tenant_id=eq.${tid}&source=eq.stripe&workshop_id=in.(${ids.slice(i, i + 50).join(',')})`, { method: 'DELETE' })
if (rows.length) await sb('workshop_bookings', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows.map((r) => ({ tenant_id: tid, ...r, paid: true, is_member: false, status: 'booked', source: 'stripe' }))) })

// Per-day summary
const byDay = {}
for (const r of rows) { const m = matchers.find((x) => x.id === r.workshop_id); const k = `${m.date} — ${m.title}`; byDay[k] = (byDay[k] || 0) + (r.child_count || 1) }
console.log('Workshop days in window:', workshopDays.length, '| Stripe bookings synced:', rows.length)
console.log('--- Kids booked per day (from Stripe) ---')
for (const k of Object.keys(byDay).sort()) console.log(`${k}: ${byDay[k]}`)
