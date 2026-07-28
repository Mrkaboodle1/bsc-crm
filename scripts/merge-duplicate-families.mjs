// Safely merges duplicate families. A "duplicate" = families that share an
// EMAIL or PHONE **and** the same first surname-token (so co-parents who share
// a phone but have different surnames are NEVER merged). For each cluster it
// keeps the best record (active > paused > trial > lead > past > lost) and,
// BEFORE deleting the losers, repoints every child/subscription/sale/etc. to
// the keeper — because students & subscriptions cascade-delete with a family.
//
//   node scripts/merge-duplicate-families.mjs --dry   (plan only, no changes)
//   node scripts/merge-duplicate-families.mjs         (execute)
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
    if (!r.ok) { console.log(`! ${table}: ${r.status}`); break }
    const page = await r.json(); out.push(...page); if (page.length < 1000) break
  }
  return out
}

const cleanEmail = (v) => (v || '').trim().toLowerCase()
const cleanPhone = (v) => (v || '').replace(/\D/g, '').replace(/^61/, '0')
const firstToken = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ').split(' ')[0]
const STAGE_RANK = { active: 6, paused: 5, trial: 4, lead: 3, past: 2, lost: 1 }

const families = await all('families', 'id,family_name,primary_parent,email,phone,lifecycle_stage,created_at')
const students = await all('students', 'id,family_id')
const studentCount = {}
for (const s of students) studentCount[s.family_id] = (studentCount[s.family_id] || 0) + 1
console.log(`\nLoaded ${families.length} families. ${DRY ? '(DRY RUN — no changes)' : '(LIVE)'}\n`)

// Union-Find
const parent = {}
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }; return x }
const union = (a, b) => { parent[find(a)] = find(b) }
for (const f of families) parent[f.id] = f.id

// Link families that share email/phone AND first surname-token (token len >= 2)
function linkBucket(bucket) {
  const byTok = {}
  for (const f of bucket) { const t = firstToken(f.family_name); if (t && t.length >= 2) (byTok[t] ||= []).push(f) }
  for (const grp of Object.values(byTok)) for (let i = 1; i < grp.length; i++) union(grp[0].id, grp[i].id)
}
const emailBuckets = {}, phoneBuckets = {}
for (const f of families) {
  if (cleanEmail(f.email)) (emailBuckets[cleanEmail(f.email)] ||= []).push(f)
  if (cleanPhone(f.phone).length >= 9) (phoneBuckets[cleanPhone(f.phone)] ||= []).push(f)
}
for (const b of Object.values(emailBuckets)) if (b.length > 1) linkBucket(b)
for (const b of Object.values(phoneBuckets)) if (b.length > 1) linkBucket(b)

// Build clusters
const clusters = {}
for (const f of families) { const root = find(f.id); (clusters[root] ||= []).push(f) }
const merges = Object.values(clusters).filter((c) => c.length > 1)

// Repoint helper (SET NULL refs we preserve; CASCADE refs we MUST move)
const REFS = [
  ['students', 'family_id'], ['subscriptions', 'family_id'], ['sales', 'family_id'],
  ['appointments', 'related_family_id'], ['tasks', 'related_family_id'],
  ['pending_actions', 'related_family_id'], ['email_messages', 'matched_family_id'],
]
async function repoint(table, col, from, to) {
  if (DRY) return
  const r = await fetch(`${BASE}/rest/v1/${table}?${col}=eq.${from}`, {
    method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ [col]: to }),
  })
  if (!r.ok && r.status !== 404 && r.status !== 400) console.log(`    ! repoint ${table}.${col}: ${r.status}`)
}
async function del(id) {
  if (DRY) return
  const r = await fetch(`${BASE}/rest/v1/families?id=eq.${id}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=minimal' } })
  if (!r.ok) console.log(`    ! delete ${id}: ${r.status} ${await r.text()}`)
}

console.log(`Found ${merges.length} duplicate clusters to merge:\n`)
let deleted = 0, kidsMoved = 0
for (const c of merges) {
  // keeper = best stage, then most students, then oldest
  const sorted = [...c].sort((a, b) =>
    (STAGE_RANK[b.lifecycle_stage] || 0) - (STAGE_RANK[a.lifecycle_stage] || 0)
    || (studentCount[b.id] || 0) - (studentCount[a.id] || 0)
    || (a.created_at || '').localeCompare(b.created_at || ''))
  const keeper = sorted[0]
  const losers = sorted.slice(1)
  console.log(`  KEEP "${keeper.family_name}" [${keeper.lifecycle_stage}] (${studentCount[keeper.id] || 0} kids)`)
  for (const l of losers) {
    console.log(`    ← merge "${l.family_name}" [${l.lifecycle_stage}] (${studentCount[l.id] || 0} kids)`)
    for (const [t, col] of REFS) await repoint(t, col, l.id, keeper.id)
    await del(l.id)
    deleted++; kidsMoved += studentCount[l.id] || 0
  }
}
console.log(`\n${DRY ? 'WOULD merge' : '✅ Merged'}: ${deleted} duplicate families removed, ${kidsMoved} students moved to keepers.`)
