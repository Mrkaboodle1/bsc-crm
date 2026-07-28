import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require(path.join(path.dirname(fileURLToPath(import.meta.url)), 'xlsx-tmp', 'node_modules', 'xlsx'))
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const sGet = async u => (await fetch(SUPA + '/rest/v1' + u, { headers: sh })).json()

const DATE = { '29 June': '2026-06-29', '30 June': '2026-06-30', '1 July': '2026-07-01', '2 July': '2026-07-02', '3 July': '2026-07-03', '7 July': '2026-07-07', '8 July': '2026-07-08', '9 July': '2026-07-09', '10 July': '2026-07-10' }

const wb = XLSX.readFile('D:/Bigstar Roll Call Sheets 2026 Term 2.xlsx')
const rows = XLSX.utils.sheet_to_json(wb.Sheets['T2 June-July Holidays'], { header: 1, blankrows: false, defval: '' })
const dateRe = /\b(\d{1,2})(st|nd|rd|th)?\s*(June|July)\b/i
const legend = new Set(['ATTENDANCE', 'YES', 'NO', 'SICK', 'PAY STYLE', 'PLAY ON VOUCHER', 'DIRECT DEBIT', 'STRIPE/CARD', 'CASH', 'KEY', 'BOOKING', 'CHILDS NAME', 'ATTEMPTED', 'C', 'NC', 'A', 'TOTAL KIDS ENROLLED', 'TOTAL DAY TALLY', 'AWAY WITH NOTICE'])
let day = null
const out = {}
for (const r of rows) {
  const c = r.map(x => String(x).trim())
  if (c[0] && dateRe.test(c[0]) && isNaN(Number(c[0]))) { const m = c[0].match(dateRe); day = `${m[1]} ${m[3]}`; out[day] = out[day] || []; continue }
  if (!day) continue
  const name = c[1]
  if (!name || !isNaN(Number(name)) || legend.has(name.toUpperCase()) || /^full day|coach |trainee|^away/i.test(name)) continue
  const joined = c.slice(1).join(' ')
  const parentRaw = c[2] && /^[A-Za-z]/.test(c[2]) && c[2].length < 30 && !dateRe.test(c[2]) ? c[2] : ''
  const pay = (joined.match(/play on|stripe|ndis|subscribed|cash|free trial/i) || [''])[0]
  const medical = (joined.match(/allerg[^·\d]*|asthma|epipen|nut allerg[^·]*/i) || [''])[0].trim()
  out[day].push({ name: name.slice(0, 60), parent: parentRaw, pay: pay.toLowerCase(), medical })
}

const tenant = (await sGet('/tenants?select=id&order=created_at&limit=1'))[0].id
const days = await sGet('/holiday_workshops?select=id,date,title')
const idByDate = {}; days.forEach(d => { if (!/^Kids Night Out/i.test(d.title)) idByDate[d.date] = d.id })

let loaded = 0
for (const [label, kids] of Object.entries(out)) {
  const date = DATE[label]; const wid = idByDate[date]
  if (!wid || !kids.length) continue
  // mark these as source 'roll-sheet' so we can rebuild from Excel without touching live sign-ins
  await fetch(`${SUPA}/rest/v1/workshop_attendance?workshop_id=eq.${wid}`, { method: 'DELETE', headers: sh })
  const ins = kids.map(k => ({ tenant_id: tenant, workshop_id: wid, child_name: k.name, parent_name: k.parent || null, medical: k.medical || null, notes: k.pay ? `Pay: ${k.pay}` : null, status: 'expected' }))
  const r = await fetch(`${SUPA}/rest/v1/workshop_attendance`, { method: 'POST', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify(ins) })
  console.log(`${label} (${date}): ${r.status === 201 ? ins.length + ' kids loaded' : 'ERR ' + r.status}`)
  loaded += ins.length
}
console.log('TOTAL kids loaded from roll sheet:', loaded)
