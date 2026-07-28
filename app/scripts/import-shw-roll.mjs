// Load Rhett's master SHW sheet as the TRUE day roll into workshop_bookings.
// Reads every child exactly (parent, phone incl "?", emergency, payment type,
// medical/NDIS/ADHD, all notes). Replaces the Stripe-only roll for each day.
import fs from 'node:fs'
import XLSX from 'xlsx'
const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const wb = XLSX.readFile('C:/Users/Rhett Morrow/my-assistant/waiver-imports/SHW Booking Rhett VS.xlsx')
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
const MM = { june: '06', july: '07' }
const dayRe = /(\d{1,2})(?:st|nd|rd|th)?\s+(june|july)\s+2026/i

const days = {}
let cur = null
for (const r of rows) {
  const a = String(r[0] || '').trim()
  const m = dayRe.exec(a)
  if (m) { cur = `2026-${MM[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`; days[cur] = days[cur] || []; continue }
  if (/childs name|^full day|^half day|coach|^key$/i.test(a)) continue
  const child = String(r[1] || '').trim()
  if (!cur || !child) continue
  const age = String(r[2] || '').trim(), carer = String(r[3] || '').trim(), phone = String(r[4] || '').trim()
  const emerg = String(r[5] || '').trim(), pay = String(r[6] || '').trim(), extra = String(r[7] || '').trim()
  let n = 1; if (/&| and /i.test(child)) n = 2; const pm = /\((\d)\)/.exec(child); if (pm) n = parseInt(pm[1])
  days[cur].push({ child, age, carer, phone, emerg, pay, extra, n })
}

const tid = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0].id

function payType(t) { const s = t.toLowerCase(); if (/play ?on|voucher/.test(s)) return 'Play On voucher'; if (/stripe/.test(s)) return 'Stripe'; if (/ndis/.test(s)) return 'NDIS'; if (/cash/.test(s)) return 'Cash'; if (/subscri|member/.test(s)) return 'Member/Subscription'; return '' }
function medical(t) { const f = []; const s = t.toLowerCase(); for (const [re, lab] of [[/ndis/, 'NDIS'], [/adhd/, 'ADHD'], [/asd|autis/, 'ASD/Autism'], [/asthma/, 'Asthma'], [/allerg|anaphyl|epipen/, 'Allergy'], [/diabet/, 'Diabetes']]) if (re.test(s)) f.push(lab); return f }

let report = []
for (const date of Object.keys(days).sort()) {
  const ws = await (await sb(`holiday_workshops?select=id,title&tenant_id=eq.${tid}&date=eq.${date}`)).json()
  if (!ws.length) { report.push(`${date}: NO workshop in CRM — skipped`); continue }
  const wid = ws[0].id
  // Replace this day's roll entirely with the sheet (sheet is the source of truth).
  await sb(`workshop_bookings?workshop_id=eq.${wid}`, { method: 'DELETE' })
  const ins = days[date].map((k) => {
    const blob = [k.child, k.emerg, k.pay, k.extra].join(' ')
    const ptype = payType(blob)
    const med = medical(blob)
    const notes = [
      k.age && `Age ${k.age}`,
      ptype && `Paid: ${ptype}`,
      k.emerg && !/play ?on|voucher|stripe/i.test(k.emerg) && `Emergency: ${k.emerg}`,
      med.length && `⚠ ${med.join(', ')}`,
      k.extra && `Note: ${k.extra}`,
    ].filter(Boolean).join(' · ')
    return {
      tenant_id: tid, workshop_id: wid,
      parent_name: k.carer || '(unknown)',
      phone: k.phone || null, // keeps "?" exactly as written
      child_names: k.child, child_count: k.n,
      is_member: /member|subscri/i.test(blob), status: 'booked',
      source: 'sheet', paid: !!ptype, amount_paid: 0,
      notes: notes || null,
    }
  })
  if (ins.length) { const r = await sb('workshop_bookings', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(ins) }); if (!r.ok) console.log('  insert err', date, (await r.text()).slice(0, 120)) }
  const kids = days[date].reduce((s, x) => s + x.n, 0)
  report.push(`${date}: ${days[date].length} rows = ${kids} kids loaded`)
}
console.log('=== Roll loaded from your sheet (exact) ===')
report.forEach((r) => console.log('  ' + r))
console.log('GRAND TOTAL kids:', Object.values(days).reduce((s, d) => s + d.reduce((a, x) => a + x.n, 0), 0))
