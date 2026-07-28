// Merge families that share the exact same email (keeps the richer record,
// re-points kids/waivers/subscriptions/appointments, deletes the loser).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const paged = async (p) => { const o = []; for (let f = 0; ; f += 1000) { const r = await fetch(SUPA + '/rest/v1' + p, { headers: { ...sh, Range: `${f}-${f + 999}` } }); const c = await r.json(); o.push(...c); if (c.length < 1000) break } return o }
const repoint = (table, col, from, to) => fetch(`${SUPA}/rest/v1/${table}?${col}=eq.${from}`, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify({ [col]: to }) })

const fams = await paged('/families?select=id,email,stripe_customer_id,created_at')
const students = await paged('/students?select=id,family_id')
const cnt = {}; for (const s of students) cnt[s.family_id] = (cnt[s.family_id] || 0) + 1
const byEmail = {}
for (const f of fams) { if (!f.email) continue; const e = f.email.toLowerCase().trim(); (byEmail[e] ||= []).push(f) }

let merged = 0
for (const [email, list] of Object.entries(byEmail)) {
  if (list.length < 2) continue
  list.sort((a, b) => (b.stripe_customer_id ? 1 : 0) - (a.stripe_customer_id ? 1 : 0) || (cnt[b.id] || 0) - (cnt[a.id] || 0) || new Date(a.created_at) - new Date(b.created_at))
  const keep = list[0]
  for (const lose of list.slice(1)) {
    await repoint('students', 'family_id', lose.id, keep.id)
    await repoint('signed_waivers', 'family_id', lose.id, keep.id)
    await repoint('subscriptions', 'family_id', lose.id, keep.id).catch(() => {})
    await repoint('appointments', 'related_family_id', lose.id, keep.id).catch(() => {})
    await fetch(`${SUPA}/rest/v1/families?id=eq.${lose.id}`, { method: 'DELETE', headers: { ...sh, Prefer: 'return=minimal' } })
    merged++
    console.log(`merged ${email}: kept ${keep.id}, removed ${lose.id}`)
  }
}
console.log(`Done. Duplicate families merged: ${merged}`)
