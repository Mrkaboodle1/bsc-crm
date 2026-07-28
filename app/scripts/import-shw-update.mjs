// Careful update: Free Trial leads + new SHW waivers + Play On vouchers.
// Double-deduped, with safety caps so nothing gets copied.
import fs from 'node:fs'
const DIR = 'C:/Users/Rhett Morrow/my-assistant/waiver-imports/'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const norm = (e) => (e || '').trim().toLowerCase()
const phone = (s) => (s || '').replace(/[^\d+]/g, '')
function parseCsv(text) { const rows = []; let f = '', row = [], q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c } else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' } else if (c === '\r') {} else f += c } } if (f.length || row.length) { row.push(f); rows.push(row) } return rows }
const obj = (head, row) => Object.fromEntries(head.map((h, i) => [h.trim(), (row[i] || '').trim()]))

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id

// Existing state for dedupe
const famEmails = new Set()
{ let off = 0; while (true) { const d = await (await sb(`families?select=email&limit=1000&offset=${off}`)).json(); d.forEach((x) => x.email && famEmails.add(norm(x.email))); if (d.length < 1000) break; off += 1000 } }
const wKeys = new Set(); const wEmailEvent = new Set()
{ let off = 0; while (true) { const d = await (await sb(`signed_waivers?select=import_key,email,event_type&limit=1000&offset=${off}`)).json(); d.forEach((x) => { if (x.import_key) wKeys.add(x.import_key); if (x.email) wEmailEvent.add(norm(x.email) + '|' + x.event_type) }); if (d.length < 1000) break; off += 1000 } }
const vRefs = new Set((await (await sb('play_on_vouchers?select=voucher_ref')).json()).map((x) => (x.voucher_ref || '').toUpperCase()))
console.log(`Existing: ${famEmails.size} family emails, ${wKeys.size} waiver keys, ${vRefs.size} vouchers`)

// ---------- 1) FREE TRIAL leads ----------
const ftRows = parseCsv(fs.readFileSync(DIR + 'Free trial 26 june updated 87a6ef60-44b7-4ef5-9b94-2b8140c5d03c.csv', 'utf8'))
const ftHead = ftRows[0]
let ftNew = 0
const ftToAdd = []
for (let r = 1; r < ftRows.length; r++) {
  const o = obj(ftHead, ftRows[r]); const email = norm(o['Email']); if (!email || famEmails.has(email)) continue
  const name = `${o['First Name'] || ''} ${o['Last Name'] || ''}`.trim()
  const kids = [o['Childs Name 1'], o['Childs Name 2']].filter(Boolean).join(', ')
  ftToAdd.push({ tenant_id: tid, family_name: (o['Last Name'] || name || 'Family').trim(), primary_parent: name, email: o['Email'], phone: phone(o['Phone']) || null, source: 'other', lifecycle_stage: 'lead', tags: ['free-trial'], notes: [o['What class do you want to attend?'], kids && `Kids: ${kids}`, o['Please add any additional details you feel we may need.']].filter(Boolean).join(' · ').slice(0, 500) })
  famEmails.add(email); ftNew++
}
let ftDone = 0
for (let i = 0; i < ftToAdd.length; i += 200) { const r = await sb('families', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(ftToAdd.slice(i, i + 200)) }); if (r.ok) ftDone += ftToAdd.slice(i, i + 200).length; else console.log('  family insert error:', (await r.text()).slice(0, 150)) }
console.log(`Free Trial leads saved: ${ftDone} of ${ftNew}`)

// ---------- 2) NEW SHW waivers ----------
const shwRows = parseCsv(fs.readFileSync(DIR + 'SHW 26th June updated 7e70f1c8-e779-490d-b6d6-2a2e0d5f4156.csv', 'utf8'))
const shwHead = shwRows[0]
const shwToAdd = []
for (let r = 1; r < shwRows.length; r++) {
  const o = obj(shwHead, shwRows[r]); const order = o['Order Id']; const email = norm(o['Email'])
  if (!order || !email) continue
  const key = 'shw:' + order
  if (wKeys.has(key) || wEmailEvent.has(email + '|shw')) continue // double dedupe (matches existing format)
  const children = ['Child 1 Name & Age', 'Child 2 Name & Age', 'Child 3 Name & Age', 'Child 4 Name & Age'].map((k) => o[k]).filter(Boolean).join('; ')
  shwToAdd.push({ tenant_id: tid, event_type: 'shw', parent_name: o['Parent Full Name '] || o['Parent Full Name'] || null, email: o['Email'], phone: phone(o['Phone']) || null, emergency: o['Emergency Name & Phone Number '] || null, children, medical: o['Medical Conditions/Allergies'] || null, terms_agreed: true, signature: o['Signature'] || null, import_key: key, answers: { payment: o['Payment Amount'], status: o['Payment Status'], notes: o['Other Notes We Should Know '], submitted: o['Submission Date'] } })
  wKeys.add(key)
}
if (shwToAdd.length > 15) { console.log(`⚠ SAFETY STOP: would add ${shwToAdd.length} SHW waivers (expected ~3). NOT inserting — needs a look.`) }
else { if (shwToAdd.length) await sb('signed_waivers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(shwToAdd) }); console.log(`New SHW waivers added: ${shwToAdd.length}`, shwToAdd.map((w) => w.parent_name)) }

// ---------- 3) Play On vouchers (confidently read) ----------
const VOUCHERS = [
  ['8FJJ7T98', 'Millie Goldstone', 200], ['4BXVY9TN', 'Jacob Goldstone', 200],
  ['TCKPCXXK', 'Tyrell T Larcombe', 200], ['CZPYX8VU', 'Arabella M Holmes', 200], ['VFMLBW37', 'India W Anderson', 200],
  ['GYGV8KGN', 'Sandra G McKay', 200], ['HNNU6L8U', 'Charli S Menger', 200], ['PXFRVD62', 'Chanelle L Steyn', 200],
  ['4BUNVTM4', 'Daul Park', 200], ['3F7UZLGC', 'Lexi S Menger', 60], ['L6PUDCWQ', 'Natalie Greenwood (child)', 200], ['L6V9N3PZ', 'Dawn Smith (child)', 200],
]
const vAdd = VOUCHERS.filter(([ref]) => !vRefs.has(ref.toUpperCase())).map(([ref, student, amount]) => ({ tenant_id: tid, voucher_ref: ref, student_name: student, amount, weekly_value: 20, weeks: 10, status: 'active', use_type: 'workshop', redeemed_on: new Date().toISOString().slice(0, 10) }))
if (vAdd.length) await sb('play_on_vouchers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(vAdd) })
console.log(`Play On vouchers recorded: ${vAdd.length}`)
console.log('\nDONE.')
