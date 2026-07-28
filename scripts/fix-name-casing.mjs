// Fixes ONLY clearly-wrong name capitalisation (entirely lower-case or
// entirely UPPER-CASE). Leaves intentional mixed-case names (McDonald,
// Ellis-Smith, O'Keefe) untouched. Also REPORTS high-confidence duplicate
// families (shared email/phone) WITHOUT changing them. Paginates all rows.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../server-jacky/.env'), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const BASE = get('SUPABASE_URL')
const KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const TENANT = '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const DRY = process.argv.includes('--dry')

async function all(table, cols) {
  const out = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${table}?select=${cols}&tenant_id=eq.${TENANT}&order=id&limit=1000&offset=${off}`, { headers: h })
    if (!r.ok) { console.log(`! ${table}: ${r.status} ${await r.text()}`); break }
    const page = await r.json()
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}

// Acronyms / tags that must stay as-is (never title-cased).
const KEEP = new Set(['NDIS', 'OT', 'GC', 'OOSH', 'PD', 'ASD', 'ADHD', 'TLC', 'VIP', 'NDIA', 'OSHC'])
// Title-case that respects spaces, hyphens and apostrophes — and preserves
// known acronyms (NDIS stays NDIS, not Ndis).
const titleCase = (s) => (s || '')
  .split(' ')
  .map((word) => {
    if (KEEP.has(word.toUpperCase())) return word.toUpperCase()
    return word.toLowerCase().replace(/(^|[\-'])([a-z])/g, (_, p, c) => p + c.toUpperCase())
  })
  .join(' ')
// Only fix names that are ALL one case (no intentional mixed case like McDonald).
function needsFix(name) {
  if (!name || name.includes('@')) return false
  const letters = name.replace(/[^A-Za-z]/g, '')
  if (letters.length < 2) return false
  const allOneCase = letters === letters.toLowerCase() || letters === letters.toUpperCase()
  return allOneCase && titleCase(name) !== name
}

async function patch(table, id, body) {
  if (DRY) return true
  const r = await fetch(`${BASE}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body),
  })
  if (!r.ok) { console.log(`  ! patch ${table} ${id}: ${r.status} ${await r.text()}`); return false }
  return true
}

const families = await all('families', 'id,family_name,primary_parent,email,phone,lifecycle_stage')
const students = await all('students', 'id,first_name,last_name,family_id')
console.log(`\nLoaded ${families.length} families, ${students.length} students. ${DRY ? '(DRY RUN)' : '(LIVE)'}\n`)

// 1. Fix family_name + primary_parent
let fFix = 0
for (const f of families) {
  const body = {}
  if (needsFix(f.family_name)) body.family_name = titleCase(f.family_name)
  if (needsFix(f.primary_parent)) body.primary_parent = titleCase(f.primary_parent)
  if (Object.keys(body).length) {
    console.log(`  family ${f.family_name}${body.family_name ? ` → ${body.family_name}` : ''}${body.primary_parent ? `  parent → ${body.primary_parent}` : ''}`)
    if (await patch('families', f.id, body)) fFix++
  }
}

// 2. Fix student first/last
let sFix = 0
for (const s of students) {
  const body = {}
  if (needsFix(s.first_name)) body.first_name = titleCase(s.first_name)
  if (needsFix(s.last_name)) body.last_name = titleCase(s.last_name)
  if (Object.keys(body).length) {
    console.log(`  student ${s.first_name} ${s.last_name ?? ''} → ${body.first_name ?? s.first_name} ${body.last_name ?? s.last_name ?? ''}`)
    if (await patch('students', s.id, body)) sFix++
  }
}

console.log(`\n✅ Fixed casing on ${fFix} families and ${sFix} students.`)

// 3. REPORT high-confidence duplicate families (shared email or phone). No changes.
const byEmail = {}, byPhone = {}
const clean = (v) => (v || '').trim().toLowerCase()
const cleanPhone = (v) => (v || '').replace(/\D/g, '').replace(/^61/, '0')
for (const f of families) {
  if (clean(f.email)) (byEmail[clean(f.email)] ||= []).push(f)
  if (cleanPhone(f.phone).length >= 9) (byPhone[cleanPhone(f.phone)] ||= []).push(f)
}
const dupeEmail = Object.entries(byEmail).filter(([, v]) => v.length > 1)
const dupePhone = Object.entries(byPhone).filter(([, v]) => v.length > 1)
console.log(`\n--- ${dupeEmail.length} families share an EMAIL (likely true duplicates) ---`)
dupeEmail.slice(0, 40).forEach(([e, v]) => console.log(`  ${e}  →  ${v.map((x) => `${x.family_name}[${x.lifecycle_stage}]`).join(' + ')}`))
console.log(`\n--- ${dupePhone.length} families share a PHONE ---`)
dupePhone.slice(0, 40).forEach(([p, v]) => console.log(`  ${p}  →  ${v.map((x) => `${x.family_name}[${x.lifecycle_stage}]`).join(' + ')}`))
console.log('\n(Duplicates only REPORTED — nothing merged or deleted.)')
