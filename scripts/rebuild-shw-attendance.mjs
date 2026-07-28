// Rebuild the roll (workshop_attendance) for upcoming School Holiday Workshop days
// from the live bookings: real kid names + medical from each parent's signed waiver,
// and the parent's PHONE as the contact. Pre-event only (safe to rebuild).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const G = async (u) => (await fetch(SUPA + '/rest/v1' + u, { headers: sh })).json()
const last8 = (p) => String(p ?? '').replace(/[^\d]/g, '').slice(-8)
const FROM = '2026-06-29'

// Parse "Archer, 5, Asher, 6" / "Sienna 7, Hugh 5" / "Aubrey Harders 10" -> ["Archer","Asher"] ...
function kidNames(raw) {
  if (!raw) return []
  return String(raw).replace(/&|\band\b/gi, ',').split(/[,\n;]/)
    .map(s => s.replace(/\b(\d+\s*(yrs?|years?|yo)?|age\s*\d+)\b/gi, '').replace(/\(.*?\)/g, '').replace(/[0-9]/g, '').trim())
    .filter(s => s.length > 1)
}

const tenant = (await G('/tenants?select=id&order=created_at&limit=1'))[0].id
const days = (await G('/holiday_workshops?select=id,date,title&order=date')).filter(d => !/^Kids Night Out/i.test(d.title) && d.date >= FROM)
// Preload SHW waivers, indexed by phone / email / name.
const waivers = await G('/signed_waivers?select=parent_name,email,phone,children,medical&event_type=eq.shw&limit=5000')
const wByPhone = new Map(), wByEmail = new Map(), wByName = new Map()
for (const w of waivers) { if (last8(w.phone)) wByPhone.set(last8(w.phone), w); if (w.email) wByEmail.set(w.email.toLowerCase().trim(), w); if (w.parent_name) wByName.set(w.parent_name.toLowerCase().trim(), w) }

let totalRows = 0
for (const d of days) {
  const bookings = await G(`/workshop_bookings?select=parent_name,email,phone,child_count&workshop_id=eq.${d.id}&status=eq.booked`)
  const rows = []
  for (const b of bookings) {
    const w = (last8(b.phone) && wByPhone.get(last8(b.phone))) || (b.email && wByEmail.get(b.email.toLowerCase().trim())) || (b.parent_name && wByName.get(b.parent_name.toLowerCase().trim())) || null
    const names = w ? kidNames(w.children) : []
    const count = Math.max(1, Number(b.child_count) || 1)
    const first = (b.parent_name || '').split(' ')[0] || 'Child'
    for (let i = 0; i < count; i++) {
      rows.push({
        tenant_id: tenant, workshop_id: d.id,
        child_name: names[i] || (count > 1 ? `${first}'s child ${i + 1}` : `${first}'s child`),
        parent_name: b.parent_name || (w && w.parent_name) || null,
        parent_contact: b.phone || b.email || null,
        medical: (w && w.medical && !/^none$/i.test(w.medical)) ? w.medical : null,
        status: 'expected',
      })
    }
  }
  // Replace this day's roll (pre-event, no sign-ins yet).
  await fetch(`${SUPA}/rest/v1/workshop_attendance?workshop_id=eq.${d.id}`, { method: 'DELETE', headers: { ...sh, Prefer: 'return=minimal' } })
  if (rows.length) await fetch(`${SUPA}/rest/v1/workshop_attendance`, { method: 'POST', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
  totalRows += rows.length
  console.log(`${d.date}: ${bookings.length} bookings -> ${rows.length} kids on the roll`)
}
console.log(`\nDone. Total kids placed on upcoming SHW rolls: ${totalRows}`)
