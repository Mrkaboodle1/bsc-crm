// Apply Rhett's payment answers for the unmarked SHW kids, fix Oliver's contact/
// medical, mark Narvah as a member catch-up and add her sister.
import fs from 'node:fs'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id
const ws = await (await sb(`holiday_workshops?select=id,date&tenant_id=eq.${tid}&date=gte.2026-06-29&date=lte.2026-07-10`)).json()
const wid = (d) => ws.find((w) => w.date === d)?.id

// child_names match → set payment on the owner-side booking (coaches don't see this)
const marks = [
  { d: '2026-06-29', m: 'Millie Sherlock', pay: 'Stripe', note: 'KNO credit 30 May — Millie was sick' },
  { d: '2026-06-29', m: 'charlisee', pay: 'Stripe' },
  { d: '2026-07-02', m: 'Millie', pay: 'Stripe' },
  { d: '2026-07-02', m: 'Merendino', pay: 'Stripe' },
  { d: '2026-07-08', m: 'Skylah', pay: 'Stripe' },
  { d: '2026-07-08', m: 'Harley', pay: 'Stripe' },
  { d: '2026-07-08', m: 'Mikkelsen', pay: 'Stripe' },
  { d: '2026-07-09', m: 'Mikkelsen', pay: 'Stripe' },
  { d: '2026-07-08', m: 'narvah', pay: 'Member', member: true, note: 'Subscriber catch-up (missed 2 classes)' },
]
for (const x of marks) {
  const id = wid(x.d); if (!id) continue
  const body = { paid: x.pay !== 'Member', is_member: !!x.member, notes: [`Paid: ${x.pay}`, x.note].filter(Boolean).join(' · ') }
  const r = await sb(`workshop_bookings?workshop_id=eq.${id}&child_names=ilike.*${encodeURIComponent(x.m)}*`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) })
  const n = r.ok ? (await r.json()).length : 0
  console.log(`${x.d} ${x.m} → ${x.pay}: ${n} updated`)
}

// Oliver Merendino — fill contact + medical on the roll
const o2 = wid('2026-07-02')
await sb(`workshop_bookings?workshop_id=eq.${o2}&child_names=ilike.*Merendino*`, { method: 'PATCH', body: JSON.stringify({ parent_name: 'Rebecca Bailey', phone: '0402506966' }) })
await sb(`workshop_attendance?workshop_id=eq.${o2}&child_name=ilike.*Merendino*`, { method: 'PATCH', body: JSON.stringify({ parent_name: 'Rebecca Bailey', parent_contact: '0402506966', medical: 'ADHD, ASD — on ADHD medication (taken at home, none needed during the day)' }) })
console.log('Oliver Merendino: contact + medical added')

// Add Narvah's sister to 8 July (member, attending too)
const j8 = wid('2026-07-08')
const bk = await (await sb('workshop_bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ tenant_id: tid, workshop_id: j8, parent_name: 'Laura Prout', phone: '0424552496', child_names: 'Nava (sister of Narvah)', child_count: 1, is_member: true, status: 'booked', source: 'sheet', paid: false, notes: 'Paid: Member · sibling of Narvah (waiver lists sister as Mia Prout — confirm name)' }) })).json()
await sb('workshop_attendance', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ tenant_id: tid, workshop_id: j8, booking_id: bk[0]?.id, child_name: 'Nava', parent_name: 'Laura Prout', parent_contact: '0424552496', medical: null, status: 'expected', notes: 'Sister of Narvah' }) })
console.log('Added Nava (Narvah\'s sister) to 8 July')

// Final counts
let grand = 0
for (const w of ws.sort((a, b) => a.date.localeCompare(b.date))) { const a = await (await sb(`workshop_attendance?select=id&workshop_id=eq.${w.id}`)).json(); grand += a.length; if (a.length) console.log(`${w.date}: ${a.length}`) }
console.log('GRAND TOTAL on rolls:', grand)
