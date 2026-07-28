// RECOVERY: undo today's duplicate families from the waiver import, then re-link
// the (safely stored) signed_waivers to existing families by email/phone.
// Creates NO new families.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const sGet = (p) => fetch(SUPA + '/rest/v1' + p, { headers: sh }).then(r => r.json())
const last8 = (p) => String(p ?? '').replace(/[^\d]/g, '').slice(-8)

// 1. Delete ONLY the families I created today (import-tagged + created today). Cascade
//    removes their import-created kids; signed_waivers.family_id is set to null.
const delRes = await fetch(SUPA + '/rest/v1/families?notes=like.Imported*&created_at=gte.2026-06-22', {
  method: 'DELETE', headers: { ...sh, Prefer: 'return=representation' },
})
const deleted = await delRes.json()
console.log('Duplicate families deleted today:', Array.isArray(deleted) ? deleted.length : delRes.status)

// 2. Reload remaining families and build match maps.
const fams = await sGet('/families?select=id,email,phone&limit=20000')
const byEmail = new Map(), byPhone = new Map()
for (const f of fams) { if (f.email) byEmail.set(f.email.toLowerCase().trim(), f.id); if (last8(f.phone)) byPhone.set(last8(f.phone), f.id) }

// 3. Re-link each signed waiver to an existing family (no creation).
const waivers = await sGet('/signed_waivers?select=id,email,phone,family_id&limit=5000')
let linked = 0, unlinked = 0
for (const w of waivers) {
  const fid = (w.email && byEmail.get(w.email.toLowerCase().trim())) || (last8(w.phone) && byPhone.get(last8(w.phone))) || null
  if (fid) {
    if (w.family_id !== fid) await fetch(SUPA + '/rest/v1/signed_waivers?id=eq.' + w.id, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify({ family_id: fid }) })
    linked++
  } else {
    if (w.family_id) await fetch(SUPA + '/rest/v1/signed_waivers?id=eq.' + w.id, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify({ family_id: null }) })
    unlinked++
  }
}
console.log('Signed waivers total:', waivers.length)
console.log('Linked to an existing family:', linked)
console.log('No family match (kept as standalone record):', unlinked)
console.log('Families remaining:', fams.length)
