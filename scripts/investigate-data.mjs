// READ-ONLY data investigation — finds duplicate students/families and
// non-title-case names. Changes NOTHING. Run: node scripts/investigate-data.mjs
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

async function all(table, cols) {
  const r = await fetch(`${BASE}/rest/v1/${table}?select=${cols}&tenant_id=eq.${TENANT}&limit=5000`, { headers: h })
  if (!r.ok) { console.log(`! ${table}: ${r.status} ${await r.text()}`); return [] }
  return r.json()
}

const titleCase = (s) => (s || '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

const families = await all('families', 'id,family_name,primary_parent,email,phone,lifecycle_stage')
const students = await all('students', 'id,first_name,last_name,family_id,status')
console.log(`\nFamilies: ${families.length} · Students: ${students.length}\n`)

// 1. Non-title-case family names
const oddFamilies = families.filter((f) => f.family_name && f.family_name !== titleCase(f.family_name))
console.log(`--- ${oddFamilies.length} families with odd capitalisation ---`)
oddFamilies.slice(0, 40).forEach((f) => console.log(`  "${f.family_name}" → "${titleCase(f.family_name)}"  [${f.lifecycle_stage}]`))

// 2. Odd-case student names
const oddStudents = students.filter((s) => {
  const fn = s.first_name || '', ln = s.last_name || ''
  return (fn && fn !== titleCase(fn)) || (ln && ln !== titleCase(ln))
})
console.log(`\n--- ${oddStudents.length} students with odd capitalisation ---`)
oddStudents.slice(0, 40).forEach((s) => console.log(`  "${s.first_name} ${s.last_name ?? ''}" → "${titleCase(s.first_name)} ${titleCase(s.last_name ?? '')}"`))

// 3. Duplicate students (same first+last, case-insensitive)
const sGroups = {}
for (const s of students) { const k = norm(`${s.first_name} ${s.last_name ?? ''}`); (sGroups[k] ||= []).push(s) }
const dupStudents = Object.entries(sGroups).filter(([, v]) => v.length > 1)
console.log(`\n--- ${dupStudents.length} duplicate STUDENT name groups ---`)
dupStudents.slice(0, 30).forEach(([k, v]) => console.log(`  "${k}" ×${v.length}  families: ${v.map((x) => x.family_id?.slice(0, 8)).join(', ')}  status: ${v.map((x) => x.status).join('/')}`))

// 4. Duplicate families (same normalised name)
const fGroups = {}
for (const f of families) { const k = norm(f.family_name); if (k) (fGroups[k] ||= []).push(f) }
const dupFamilies = Object.entries(fGroups).filter(([, v]) => v.length > 1)
console.log(`\n--- ${dupFamilies.length} duplicate FAMILY name groups ---`)
dupFamilies.slice(0, 30).forEach(([k, v]) => console.log(`  "${k}" ×${v.length}  emails: ${v.map((x) => x.email || '—').join(' | ')}  stages: ${v.map((x) => x.lifecycle_stage).join('/')}`))

console.log('\n(Read-only — nothing was changed.)')
