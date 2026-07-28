// Re-link signed_waivers to existing families by email/phone — loading ALL
// families in pages (PostgREST caps each fetch at 1000 rows). Creates nothing.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const last8 = (p) => String(p ?? '').replace(/[^\d]/g, '').slice(-8)

async function pagedGet(pathBase) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(SUPA + '/rest/v1' + pathBase, { headers: { ...sh, Range: `${from}-${from + 999}` } })
    const chunk = await r.json()
    out.push(...chunk)
    if (chunk.length < 1000) break
  }
  return out
}

const fams = await pagedGet('/families?select=id,email,phone')
const byEmail = new Map(), byPhone = new Map()
for (const f of fams) { if (f.email) byEmail.set(f.email.toLowerCase().trim(), f.id); if (last8(f.phone)) byPhone.set(last8(f.phone), f.id) }
console.log('Families loaded:', fams.length)

const waivers = await pagedGet('/signed_waivers?select=id,email,phone,family_id')
let linked = 0, unlinked = 0
for (const w of waivers) {
  const fid = (w.email && byEmail.get(w.email.toLowerCase().trim())) || (last8(w.phone) && byPhone.get(last8(w.phone))) || null
  if (fid && w.family_id !== fid) await fetch(SUPA + '/rest/v1/signed_waivers?id=eq.' + w.id, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify({ family_id: fid }) })
  if (fid) linked++; else unlinked++
}
console.log('Signed waivers:', waivers.length)
console.log('Linked to a family:', linked)
console.log('No match (standalone):', unlinked)
