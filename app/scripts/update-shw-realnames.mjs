// Read the latest SHW waiver export → put REAL child names + medical onto the roll
// (replacing the "[parent]'s child" placeholders) and save the waivers on record.
import fs from 'node:fs'
const FILE = process.argv[2] || 'C:/Users/Rhett Morrow/Downloads/4ab01b34-0bf8-4b59-b9f4-6247b5dc9fa1.csv'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const pk = (s) => (s || '').replace(/\D/g, '').slice(-9)
const nmz = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')
const cleanName = (s) => s.replace(/\d+/g, ' ').replace(/\b(years?\s*old|years?|yrs?|yo|old|y)\b/gi, ' ').replace(/[^A-Za-z '\-]/g, ' ').replace(/\s+/g, ' ').trim()
const cleanMed = (s) => { const t = String(s || '').replace(/^=?"?-?"?$/, '').trim(); return t && !/^(na|nil|none|n\/a|no|-)$/i.test(t) ? t.slice(0, 200) : null }
function parseCsv(t) { const o = []; let f = '', row = [], q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f); o.push(row); row = []; f = '' } else if (c === '\r') {} else f += c } } if (f.length || row.length) { o.push(f); o.push(row) } return o }

const rows = parseCsv(fs.readFileSync(FILE, 'utf8')); const h = rows[0].map((x) => String(x).trim())
const ix = (n) => h.findIndex((x) => x.toLowerCase().startsWith(n.toLowerCase()))
const iN = ix('Parent'), iP = ix('Phone'), iE = ix('Email'), iEm = ix('Emergency'), iMed = ix('Medical'), iSig = ix('Signature'), iPay = ix('Payment Amount'), iSt = ix('Payment Status'), iO = ix('Order Id')
const iC = [ix('Child 1'), ix('Child 2'), ix('Child 3'), ix('Child 4')]

const waivers = []
for (let r = 1; r < rows.length; r++) {
  const o = rows[r]; if (!o || !(o[iN] || '').trim()) continue
  const kids = iC.map((c) => c >= 0 ? cleanName(o[c] || '') : '').filter((x) => x.length > 1)
  waivers.push({ parent: (o[iN] || '').trim(), phone: o[iP] || '', email: (o[iE] || '').trim(), emerg: o[iEm] || '', med: cleanMed(o[iMed]), kids, order: (o[iO] || '').trim(), pay: o[iPay], status: o[iSt], sig: o[iSig] })
}
console.log('Waivers in file:', waivers.length)

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id
const ws = await (await sb(`holiday_workshops?select=id,date&tenant_id=eq.${tid}&date=gte.2026-06-29&date=lte.2026-07-10`)).json()
const wids = ws.map((w) => w.id)

// 1) save waivers on record (dedup by import_key shw:order)
const existKeys = new Set((await (await sb('signed_waivers?select=import_key&event_type=eq.shw')).json()).map((x) => x.import_key))
const toAdd = waivers.filter((w) => w.order && !existKeys.has('shw:' + w.order)).map((w) => ({ tenant_id: tid, event_type: 'shw', parent_name: w.parent, email: w.email, phone: pk(w.phone) ? '+' + (w.phone.replace(/\D/g, '')) : null, emergency: w.emerg || null, children: w.kids.join('; '), medical: w.med, terms_agreed: true, signature: w.sig || null, import_key: 'shw:' + w.order, answers: { payment: w.pay, status: w.status } }))
if (toAdd.length) await sb('signed_waivers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(toAdd) })
console.log('Waivers saved on record:', toAdd.length)

// 2) load all SHW attendance, index by phone + parent name
const att = []
for (const wid of wids) { const a = await (await sb(`workshop_attendance?select=id,workshop_id,child_name,parent_name,parent_contact,booking_id&workshop_id=eq.${wid}`)).json(); att.push(...a) }
const byKey = {}
for (const a of att) { for (const k of [pk(a.parent_contact), nmz(a.parent_name)].filter(Boolean)) (byKey[k] ||= []).push(a) }

// 3) for each waiver, replace placeholder names on that parent's roll rows with real kids
let updated = 0, bookingUpd = new Set()
for (const w of waivers) {
  const rowsForParent = [...new Set([...(byKey[pk(w.phone)] || []), ...(byKey[nmz(w.parent)] || [])])]
  if (!rowsForParent.length || !w.kids.length) continue
  const byDay = {}
  for (const a of rowsForParent) (byDay[a.workshop_id] ||= []).push(a)
  for (const wid of Object.keys(byDay)) {
    const dayRows = byDay[wid].sort((a, b) => a.id.localeCompare(b.id))
    for (let i = 0; i < dayRows.length; i++) {
      const real = w.kids[i] || w.kids[w.kids.length - 1]
      if (!real) continue
      await sb(`workshop_attendance?id=eq.${dayRows[i].id}`, { method: 'PATCH', body: JSON.stringify({ child_name: real, medical: w.med, parent_name: w.parent }) })
      updated++
      if (dayRows[i].booking_id) bookingUpd.add(dayRows[i].booking_id + '|' + wid)
    }
    // refresh the booking child_names for that day
    const anyBid = dayRows.find((d) => d.booking_id)?.booking_id
    if (anyBid) await sb(`workshop_bookings?id=eq.${anyBid}`, { method: 'PATCH', body: JSON.stringify({ child_names: w.kids.join(', ') }) })
  }
}
console.log('Roll rows updated with real names/medical:', updated)

// final per-day counts
let grand = 0
for (const wkr of ws.sort((a, b) => a.date.localeCompare(b.date))) { const a = await (await sb(`workshop_attendance?select=id&workshop_id=eq.${wkr.id}`)).json(); if (a.length) console.log(`${wkr.date}: ${a.length}`); grand += a.length }
console.log('GRAND TOTAL on rolls:', grand)
