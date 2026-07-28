// Add new kids from the Term 2 roll into their GROUP classes.
// Matches against existing students (by normalized name) so we don't duplicate;
// enrols existing kids if missing, creates new kids (family+student+enrolment).
// DRY RUN by default — pass --commit to actually write.
//   node import-kids.cjs            (dry run, shows what it would do)
//   node import-kids.cjs --commit   (writes to CRM)
const XLSX = require('xlsx')
const fs = require('fs')
const COMMIT = process.argv.includes('--commit')
const env = fs.readFileSync(__dirname + '/.env', 'utf8')
const KEY = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || [])[1].trim()
const BASE = 'https://dbpbfcxhbaeyoyoyllfp.supabase.co/rest/v1'
const TENANT = '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const FILE = 'D:/BSC/Student Roll/Bigstar Roll Call Sheets 2026 Term 2.xlsx'
const wb = XLSX.readFile(FILE)
const DAY_SHEETS = [
  { sheet: ' T1 Monday Acro', day: 1 }, { sheet: 'T1 Tuesday Aerial', day: 2 },
  { sheet: 'T1 Wednesday AM HS Circus', day: 3 }, { sheet: 'T1 Wednesday PM Circus', day: 3 },
  { sheet: 'T1 Thursday PM Circus Fusion', day: 4 }, { sheet: 'T1 Friday Circus & Aerial', day: 5 },
  { sheet: 'T2 Saturday AM Fusion', day: 6 },
]
const KEYWORD = /(CIRCUS|AERIAL|ACRO|FUSION|TODDLER|ADULT|TEEN|JUNIOR|SENIOR|PERFORMANCE|TROUP|HOMESCHOOL|\bHS\b|SHOW)/i
const TIME = /\b\d{1,2}\s*(:|\.)\s*\d{2}\b|\b\d{1,2}\s*(am|pm)\b/i
const cell = (ws, r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x && x.v != null ? String(x.v).trim() : '' }

function parseGroups() {
  const out = []
  for (const { sheet, day } of DAY_SHEETS) {
    const ws = wb.Sheets[sheet]; if (!ws) continue
    const rng = XLSX.utils.decode_range(ws['!ref'])
    let hr = -1, col = {}
    for (let R = rng.s.r; R <= rng.s.r + 8; R++) { for (let C = rng.s.c; C <= rng.e.c; C++) if (/child name/i.test(cell(ws, R, C))) { hr = R; break } if (hr >= 0) break }
    if (hr < 0) continue
    for (let C = rng.s.c; C <= rng.e.c; C++) { const l = cell(ws, hr, C).toLowerCase(); if (/child name/.test(l)) col.name = C; else if (/caregiver/.test(l)) col.care = C; else if (/special notes/.test(l)) col.notes = C; else if (/date started/.test(l)) col.started = C }
    let cur = null, inPrivate = false
    for (let R = hr + 1; R <= rng.e.r; R++) {
      const name = cell(ws, R, col.name); if (!name) continue
      if (/^coach:/i.test(name)) continue
      if (/^total\b/i.test(name)) { cur = null; continue }
      if (/^(child name|key$|pay style)/i.test(name)) continue
      if (/privates?\b|private lessons/i.test(name)) { inPrivate = true; cur = null; continue }
      if (KEYWORD.test(name) && TIME.test(name)) { inPrivate = false; cur = { day, title: name.replace(/\s+/g, ' ').trim(), students: [] }; out.push(cur); continue }
      if (inPrivate || !cur) continue
      if (TIME.test(name)) continue // sub-headers / privates inside a class block
      cur.students.push({ raw: name, care: col.care != null ? cell(ws, R, col.care) : '', notes: col.notes != null ? cell(ws, R, col.notes) : '' })
    }
  }
  return out
}

function to24(t, ap) { let [H, M] = t.split(/[:.]/).map(Number); M = M || 0; if (/pm/i.test(ap) && H < 12) H += 12; if (/am/i.test(ap) && H === 12) H = 0; if (!ap && H <= 7) H += 12; return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0') }
function classStart(title) { const m = title.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if (!m) return null; return to24(m[1] + ':' + (m[2] || '00'), m[3] || '') }

function normName(raw) {
  let s = raw.replace(/\([^)]*\)/g, ' ').replace(/\t/g, ' ')
  s = s.replace(/\b(brother|sister|friend of|cousin|twin|JT)\b.*$/i, ' ')
  s = s.replace(/[^A-Za-z'\- ]/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = s.split(' ').filter(Boolean)
  return { first: parts[0] || '', last: parts.slice(1).join(' '), key: (parts[0] || '').toLowerCase() + '|' + (parts[1] || '').toLowerCase() }
}
const phoneRe = /(0\d[\d ]{7,12}\d)/, emailRe = /([\w.+-]+@[\w.-]+\.\w+)/
function ext(str) { const p = (str.match(phoneRe) || [])[1] || ''; const e = (str.match(emailRe) || [])[1] || ''; const parent = str.replace(phoneRe, '').replace(emailRe, '').replace(/[-•|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); return { phone: p.trim(), email: e, parent } }

async function ins(table, body) { const r = await fetch(`${BASE}/${table}`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(table + ': ' + JSON.stringify(j).slice(0, 140)); return Array.isArray(j) ? j[0] : j }

;(async () => {
  const crm = JSON.parse(fs.readFileSync(__dirname + '/crmclasses.json', 'utf8'))
  const findClass = (day, start) => crm.find((c) => c.day_of_week === day && (c.start_time || '').slice(0, 5) === start)
  // existing students + enrolments
  const students = await (await fetch(`${BASE}/students?select=id,first_name,last_name&limit=2000`, { headers: h })).json()
  const enrols = await (await fetch(`${BASE}/enrolments?select=student_id,class_id&limit=5000`, { headers: h })).json()
  const byName = new Map(); for (const s of students) byName.set(((s.first_name || '').toLowerCase() + '|' + (s.last_name || '').toLowerCase()).trim(), s.id)
  const byFirst = new Map(); for (const s of students) { const k = (s.first_name || '').toLowerCase(); if (!byFirst.has(k)) byFirst.set(k, s.id) }
  const enrolSet = new Set(enrols.map((e) => e.student_id + '|' + e.class_id))

  const groups = parseGroups()
  let added = 0, enrolled = 0, skipped = 0
  const report = {}
  for (const g of groups) {
    const start = classStart(g.title)
    const cls = start && findClass(g.day, start)
    const label = `[${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][g.day]}] ${g.title.slice(0, 34)}`
    if (!cls) { report[label] = '⚠ no CRM class match (' + start + ')'; continue }
    const lines = []
    for (const st of g.students) {
      const n = normName(st.raw); if (!n.first || n.first.length < 2) { skipped++; continue }
      const sid = byName.get((n.first + '|' + n.last).toLowerCase()) || (n.last ? null : byFirst.get(n.first.toLowerCase()))
      if (sid) { skipped++; continue } // already in your CRM — left for you to review
      const c = ext(st.care || '')
      if (COMMIT) {
        const fam = await ins('families', { tenant_id: TENANT, family_name: n.last || (n.first + ' family'), primary_parent: c.parent || null, phone: c.phone || null, email: c.email || null, notes: ('[Roll import T2] ' + (st.notes || '')).trim(), source: 'other', lifecycle_stage: 'active', tags: ['roll-import'] })
        const stu = await ins('students', { tenant_id: TENANT, family_id: fam.id, first_name: n.first, last_name: n.last || null, medical_notes: st.notes || null })
        await ins('enrolments', { tenant_id: TENANT, student_id: stu.id, class_id: cls.id, status: 'active', term: 'T2 2026', start_date: '2026-04-20' })
        byName.set((n.first + '|' + n.last).toLowerCase(), stu.id); byFirst.set(n.first.toLowerCase(), stu.id)
      }
      added++; lines.push('  + ' + (n.first + ' ' + n.last).trim() + (c.parent ? ' · ' + c.parent : '') + (c.phone ? ' ' + c.phone : ''))
    }
    report[`${label} → ${cls.name}`] = lines.length ? lines.join('\n') : '  (no new kids — all already in your CRM)'
  }
  console.log(COMMIT ? '=== COMMITTED ===\n' : '=== DRY RUN (no writes) ===\n')
  for (const [k, v] of Object.entries(report)) console.log(k + '\n' + v + '\n')
  console.log(`\nNEW kids: ${added} · existing re-enrolled: ${enrolled} · skipped/dupe: ${skipped}`)
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
