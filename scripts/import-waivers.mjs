// Import signed waivers from the Tectonic CSV exports into the CRM.
// - Stores every signed form in signed_waivers (re-runnable; dedupes on import_key).
// - Matches each to an existing family by EMAIL then PHONE; creates a family only
//   when there's no match (no duplicate families). Enriches blanks, adds new kids.
// Run: node scripts/import-waivers.mjs   (after pasting schema/043_signed_waivers.sql)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require('./xlsx-tmp/node_modules/xlsx')

const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const sGet = async (p) => (await fetch(SUPA + '/rest/v1' + p, { headers: sh })).json()
const sPost = async (table, body, prefer = 'return=representation') =>
  (await fetch(SUPA + '/rest/v1/' + table, { method: 'POST', headers: { ...sh, Prefer: prefer }, body: JSON.stringify(body) }))
const sPatch = async (table, q, body) =>
  fetch(SUPA + '/rest/v1/' + table + q, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify(body) })

const IMP = path.join(__dir, '..', '..', 'waiver-imports')
const FILES = {
  free_trial: 'Free Trial ff90b66a-c824-4673-9c68-366b8c03dd21.csv',
  kno: 'KNO d381448a-439e-40b0-bf19-c9f1ad9499d7.csv',
  shw: 'SHW cfa227f5-ed7d-4310-93e9-48450cd9abe8.csv',
}
const rowsOf = (file) => {
  const wb = XLSX.readFile(path.join(IMP, file)); const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
}

const clean = (v) => String(v ?? '').trim()
const last8 = (p) => clean(p).replace(/[^\d]/g, '').slice(-8)
const firstName = (s) => { const m = clean(s).replace(/\(.*?\)/g, ' ').match(/[A-Za-z][A-Za-z'-]+/); return m ? m[0] : '' }
const yes = (v) => /yes|true|consent|agree|✓|on|1/i.test(clean(v))
const isoDate = (v) => { const d = new Date(clean(v)); return isNaN(d) ? null : d.toISOString() }

// Map one CSV row (array) to a normalised submission.
function mapRow(event, r) {
  if (event === 'free_trial') return {
    event, parentName: `${clean(r[0])} ${clean(r[1])}`.trim(), familyName: clean(r[1]) || clean(r[0]),
    email: clean(r[3]).toLowerCase(), phone: clean(r[2]), address: clean(r[4]), emergency: '',
    childNames: [r[5], r[7]].map(firstName).filter(Boolean), childrenRaw: `${clean(r[5])} ${clean(r[6])}, ${clean(r[7])} ${clean(r[8])}`.replace(/^,|,\s*$/g, '').trim(),
    medical: clean(r[10]), consent: yes(r[14]), terms: !!clean(r[13]), signature: clean(r[15]),
    signedAt: isoDate(r[22]), orderId: clean(r[19]), source: 'other', lifecycle: 'lead',
  }
  if (event === 'kno') return {
    event, parentName: `${clean(r[0])} ${clean(r[1])}`.trim(), familyName: clean(r[1]) || clean(r[0]),
    email: clean(r[3]).toLowerCase(), phone: clean(r[2]), address: '', emergency: '',
    childNames: clean(r[4]).split(/,|&|\band\b|\n/).map(firstName).filter(Boolean), childrenRaw: clean(r[4]),
    medical: clean(r[6]), consent: false, terms: !!clean(r[7]), signature: clean(r[8]),
    signedAt: isoDate(r[15]), orderId: clean(r[12]), source: 'other', lifecycle: 'lead',
  }
  // shw
  const parent = clean(r[0])
  return {
    event, parentName: parent, familyName: parent.split(/\s+/).slice(-1)[0] || parent,
    email: clean(r[2]).toLowerCase(), phone: clean(r[1]), address: '', emergency: clean(r[3]),
    childNames: [r[4], r[5], r[6], r[7]].map(firstName).filter(Boolean),
    childrenRaw: [r[4], r[5], r[6], r[7]].map(clean).filter(Boolean).join(', '),
    medical: clean(r[8]), consent: false, terms: !!clean(r[9]), signature: clean(r[11]),
    signedAt: isoDate(r[20]), orderId: clean(r[17]), source: 'other', lifecycle: 'lead',
  }
}

const tenant = (await sGet('/tenants?select=id&order=created_at&limit=1'))[0].id
const families = await sGet(`/families?select=id,family_name,primary_parent,email,phone,address,emergency_phone,emergency_name&tenant_id=eq.${tenant}&limit=20000`)
const byEmail = new Map(), byPhone = new Map()
for (const f of families) { if (f.email) byEmail.set(f.email.toLowerCase(), f); if (f.phone && last8(f.phone)) byPhone.set(last8(f.phone), f) }
const students = await sGet(`/students?select=id,family_id,first_name&tenant_id=eq.${tenant}&limit=40000`)
const studByFam = new Map()
for (const s of students) { if (!studByFam.has(s.family_id)) studByFam.set(s.family_id, new Set()); studByFam.get(s.family_id).add(clean(s.first_name).toLowerCase()) }

let matched = 0, created = 0, kidsAdded = 0
const waiverRows = []
const usedKeys = new Set()
const allRows = []
for (const [event, file] of Object.entries(FILES)) {
  const rows = rowsOf(file); rows.shift() // drop header
  for (const r of rows) { if (clean(r.join('')).length) allRows.push(mapRow(event, r)) }
}

for (const s of allRows) {
  if (!s.email && !s.phone && !s.parentName) continue
  // 1. Find the family
  let fam = (s.email && byEmail.get(s.email)) || (last8(s.phone) && byPhone.get(last8(s.phone))) || null
  if (fam) {
    matched++
    // enrich blanks only
    const patch = {}
    if (!fam.email && s.email) patch.email = s.email
    if (!fam.phone && s.phone) patch.phone = s.phone
    if (!fam.address && s.address) patch.address = s.address
    if (!fam.emergency_phone && s.emergency) patch.emergency_phone = s.emergency
    if (Object.keys(patch).length) { await sPatch('families', `?id=eq.${fam.id}`, patch); Object.assign(fam, patch) }
  } else {
    const res = await sPost('families', {
      tenant_id: tenant, family_name: s.familyName || s.parentName || 'Family', primary_parent: s.parentName || null,
      email: s.email || null, phone: s.phone || null, address: s.address || null, emergency_phone: s.emergency || null,
      source: s.source, lifecycle_stage: s.lifecycle, notes: `Imported from Tectonic waiver (${s.event})`,
    })
    const made = (await res.json())[0]
    if (!made) { continue }
    fam = made; created++
    if (s.email) byEmail.set(s.email, fam); if (last8(s.phone)) byPhone.set(last8(s.phone), fam)
    studByFam.set(fam.id, new Set())
  }
  // 2. Add any new children (dedupe by first name within the family)
  const have = studByFam.get(fam.id) || new Set()
  for (const cn of s.childNames) {
    const k = cn.toLowerCase()
    if (!k || have.has(k)) continue
    await sPost('students', { tenant_id: tenant, family_id: fam.id, first_name: cn }, 'return=minimal')
    have.add(k); kidsAdded++
  }
  studByFam.set(fam.id, have)
  // 3. Queue the signed-waiver record (ensure the dedupe key is unique per row)
  let importKey = `${s.event}:${s.orderId || (s.email || s.phone) + '|' + (s.signedAt || '')}`
  const base = importKey; let nKey = 1
  while (usedKeys.has(importKey)) { nKey++; importKey = `${base}#${nKey}` }
  usedKeys.add(importKey)
  waiverRows.push({
    tenant_id: tenant, family_id: fam.id, event_type: s.event, parent_name: s.parentName || null,
    email: s.email || null, phone: s.phone || null, emergency: s.emergency || null, children: s.childrenRaw || null,
    medical: s.medical || null, consent_photo: s.consent, terms_agreed: s.terms, signature: s.signature || null,
    signed_at: s.signedAt, import_key: importKey, answers: {},
  })
}

// 4. Upsert waivers in chunks (dedupe on import_key)
let waiversSaved = 0
for (let i = 0; i < waiverRows.length; i += 200) {
  const chunk = waiverRows.slice(i, i + 200)
  const res = await sPost('signed_waivers?on_conflict=tenant_id,import_key', chunk, 'resolution=merge-duplicates,return=minimal')
  if (res.ok) waiversSaved += chunk.length
  else console.log('waiver chunk error', res.status, (await res.text()).slice(0, 200))
}

console.log(`\nDONE`)
console.log(`Signed waivers stored: ${waiversSaved} (of ${waiverRows.length})`)
console.log(`Families matched to existing: ${matched}`)
console.log(`New families created: ${created}`)
console.log(`New children added: ${kidsAdded}`)
