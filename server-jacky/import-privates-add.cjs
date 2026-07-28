// Add the extra private lessons Rhett asked for (Robina College, Specialise x2,
// Ashton, Tom). Same pattern as import-privates.cjs. Idempotent on class name.
const fs = require('fs')
const env = fs.readFileSync(__dirname + '/.env', 'utf8')
const KEY = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || [])[1].trim()
const BASE = 'https://dbpbfcxhbaeyoyoyllfp.supabase.co/rest/v1'
const TENANT = '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const RHETT = '0b2ae044-6391-4563-a1f9-ed1081a00efa'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const KIDS = {
  robina:     { first: 'Robina College', last: 'Group', medical: '', fam: 'Robina College (School Group)', parent: 'Shannon and Jodie', phone: '', email: '', notes: 'School group booking. Xero invoice.' },
  specialise: { first: 'Specialise', last: 'Program', medical: '', fam: 'Specialise (NDIS Program)', parent: 'Admin', phone: '0478 741 621', email: '', notes: 'NDIS program/venue. Xero invoice.' },
  ashton:     { first: 'Ashton', last: '', medical: '', fam: 'Ashton (Private)', parent: 'Julie (Mum)', phone: '0401 477 991', email: '', notes: '' },
  tom:        { first: 'Tom', last: '', medical: '', fam: 'Tom (Private)', parent: 'Andrew (Dad)', phone: '0403 562 722', email: '', notes: 'Saturday private lesson after BSC classes.' },
}

const LESSONS = [
  { kid: 'robina',     name: '🔒 Private — Robina College (Mon 10am–12pm)', day: 1, start: '10:00:00', dur: 120 },
  { kid: 'specialise', name: '🔒 Private — Specialise (Mon 12:30–2:30pm)',   day: 1, start: '12:30:00', dur: 120 },
  { kid: 'specialise', name: '🔒 Private — Specialise (Wed 1:30–2:30pm)',    day: 3, start: '13:30:00', dur: 60 },
  { kid: 'ashton',     name: '🔒 Private — Ashton (Wed 3–3:45pm)',           day: 3, start: '15:00:00', dur: 45 },
  { kid: 'tom',        name: '🔒 Private — Tom (Sat 10–11am)',               day: 6, start: '10:00:00', dur: 60 },
]

async function ins(table, body) {
  const r = await fetch(`${BASE}/${table}`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok) throw new Error(`${table}: ${JSON.stringify(j).slice(0, 160)}`)
  return Array.isArray(j) ? j[0] : j
}
async function exists(table, qs) {
  const r = await fetch(`${BASE}/${table}?${qs}&select=id`, { headers: h })
  const j = await r.json()
  return Array.isArray(j) && j.length ? j[0].id : null
}

;(async () => {
  const studentId = {}
  for (const [k, kid] of Object.entries(KIDS)) {
    const notes = `[Imported from Term 2 roll — private lesson] ${kid.notes || ''}`.trim()
    const fam = await ins('families', { tenant_id: TENANT, family_name: kid.fam, primary_parent: kid.parent, phone: kid.phone || null, email: kid.email || null, notes, source: 'other', lifecycle_stage: 'active', tags: ['private', 'roll-import'] })
    const stu = await ins('students', { tenant_id: TENANT, family_id: fam.id, first_name: kid.first, last_name: kid.last || null, medical_notes: kid.medical || null })
    studentId[k] = stu.id
    console.log(`👨‍👩‍👧 ${kid.first} — family+student created`)
  }
  for (const L of LESSONS) {
    const dup = await exists('classes', `name=eq.${encodeURIComponent(L.name)}`)
    if (dup) { console.log(`↺ exists, skip: ${L.name}`); continue }
    const cls = await ins('classes', { tenant_id: TENANT, name: L.name, day_of_week: L.day, start_time: L.start, duration_minutes: L.dur, discipline: 'private', primary_coach_id: RHETT, capacity: 1, status: 'active' })
    await ins('enrolments', { tenant_id: TENANT, student_id: studentId[L.kid], class_id: cls.id, status: 'active', term: 'T2 2026', start_date: '2026-04-20' })
    console.log(`🔒 ${L.name} — created`)
  }
  console.log('\n✅ Extra private lessons added.')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
