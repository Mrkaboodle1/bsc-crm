// Create the Term 2 private lessons as their own classes (assigned to Rhett,
// the lead coach, so only his coach login sees them). Each lesson: a family +
// student (with notes) + a private class + an enrolment.
// Idempotent on class name — skips a lesson if that class already exists.
const fs = require('fs')
const env = fs.readFileSync(__dirname + '/.env', 'utf8')
const KEY = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || [])[1].trim()
const BASE = 'https://dbpbfcxhbaeyoyoyllfp.supabase.co/rest/v1'
const TENANT = '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const RHETT = '0b2ae044-6391-4563-a1f9-ed1081a00efa'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// one entry per kid (family + student created once)
const KIDS = {
  isla:  { first: 'Isla', last: '', medical: '', fam: 'Isla (Private)', parent: 'Tiarne (Support Worker)', phone: '0480 483 420', email: '', notes: 'Xero invoice. NDIS support worker Tiarne.' },
  naomi: { first: 'Naomi', last: 'Duggan', medical: 'Naomi is autistic.', fam: 'Duggan', parent: 'Melissa (Mum) & Micheal (Dad)', phone: '0411 894 290', email: 'melissa.duggan13@gmail.com', notes: '' },
  aidyn: { first: 'Aidyn', last: 'Brennan', medical: '', fam: 'Brennan', parent: 'Angela (Angie) Brennan (Mother)', phone: '0401 978 119', email: '', notes: 'Brie is Support Worker. Planner rejected invoice due to date — add email to CRM. Rhett to invoice.' },
  llaton:{ first: 'Llaton', last: '', medical: 'Behaviour can become intense.', fam: 'Llaton (Private)', parent: 'Tyler (Social Worker)', phone: '', email: '', notes: 'Rhett to invoice.' },
  carry: { first: 'Carry', last: '', medical: 'Special needs.', fam: 'Carry (Private)', parent: 'Carol Pickering', phone: '0413 853 529', email: '', notes: 'Carol Pickering (Chinese). CC $60.' },
  lucas: { first: 'Lucas', last: '', medical: 'NDIS.', fam: 'Lucas (Private NDIS)', parent: 'Ann Langley (AUM Support Coordinator)', phone: '0491 618 784', email: 'ann@aumsc.com.au', notes: 'NDIS. Accounts accounts@aumsc.com.au. Social Worker Jaden 0435 790 718.' },
  moomoo:{ first: 'Moo Moo', last: '', medical: '', fam: 'Moo Moo (Private)', parent: 'Tina', phone: '0408 395 097', email: '', notes: 'Rhett confirmed 27/01.' },
}

// one entry per lesson (class + enrolment)
const LESSONS = [
  { kid: 'isla',   name: '🔒 Private — Isla (Mon 9–10am)',          day: 1, start: '09:00:00', dur: 60 },
  { kid: 'naomi',  name: '🔒 Private — Naomi Duggan (Mon 3pm)',     day: 1, start: '15:00:00', dur: 45 },
  { kid: 'aidyn',  name: '🔒 Private — Aidyn Brennan (Tue 9:45am)', day: 2, start: '09:45:00', dur: 45 },
  { kid: 'llaton', name: '🔒 Private — Llaton (Tue 11am–12pm)',     day: 2, start: '11:00:00', dur: 60 },
  { kid: 'carry',  name: '🔒 Private — Carry (Tue 3pm)',            day: 2, start: '15:00:00', dur: 45 },
  { kid: 'lucas',  name: '🔒 Private — Lucas (Thu 10–11am, NDIS)',  day: 4, start: '10:00:00', dur: 60 },
  { kid: 'moomoo', name: '🔒 Private — Moo Moo (Thu 3–3:45pm)',     day: 4, start: '15:00:00', dur: 45 },
  { kid: 'moomoo', name: '🔒 Private — Moo Moo (Sat 8:15am)',       day: 6, start: '08:15:00', dur: 45 },
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
  // 1. families + students (once per kid)
  for (const [k, kid] of Object.entries(KIDS)) {
    const famNotes = `[Imported from Term 2 roll — private lesson] ${kid.notes || ''}`.trim()
    const fam = await ins('families', { tenant_id: TENANT, family_name: kid.fam, primary_parent: kid.parent, phone: kid.phone || null, email: kid.email || null, notes: famNotes, source: 'other', lifecycle_stage: 'active', tags: ['private', 'roll-import'] })
    const stu = await ins('students', { tenant_id: TENANT, family_id: fam.id, first_name: kid.first, last_name: kid.last || null, medical_notes: kid.medical || null })
    studentId[k] = stu.id
    console.log(`👨‍👩‍👧 ${kid.first} ${kid.last} — family+student created`)
  }
  // 2. classes + enrolments (per lesson)
  for (const L of LESSONS) {
    const dup = await exists('classes', `name=eq.${encodeURIComponent(L.name)}`)
    if (dup) { console.log(`↺ class exists, skip: ${L.name}`); continue }
    const cls = await ins('classes', { tenant_id: TENANT, name: L.name, day_of_week: L.day, start_time: L.start, duration_minutes: L.dur, discipline: 'private', primary_coach_id: RHETT, capacity: 1, status: 'active' })
    await ins('enrolments', { tenant_id: TENANT, student_id: studentId[L.kid], class_id: cls.id, status: 'active', term: 'T2 2026', start_date: '2026-04-20' })
    console.log(`🔒 ${L.name} — class + enrolment created`)
  }
  console.log('\n✅ Private lessons imported.')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
